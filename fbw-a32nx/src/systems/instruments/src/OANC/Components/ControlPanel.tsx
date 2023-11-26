// Copyright (c) 2021-2023 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import {
    ArraySubject, ComponentProps, DisplayComponent, DmsFormatter2, FSComponent, MappedSubscribable, MapSubject, Subject, Subscribable, Subscription, UnitType,
    VNode,
} from '@microsoft/msfs-sdk';

import { AmdbAirportSearchResult } from '@flybywiresim/fbw-sdk';
import { NavigraphAmdbClient } from '../api/NavigraphAmdbClient';
import { RadioButtonGroup } from './RadioButtonGroup';
import { DropdownMenu } from './DropdownMenu';

import './ControlPanel.scss';

export interface ControlPanelProps extends ComponentProps {
    amdbClient: NavigraphAmdbClient,

    isVisible: Subscribable<boolean>,

    onSelectAirport: (airportIcao: string) => void,
}

class ControlPanelStore {
    public readonly airports = ArraySubject.create<AmdbAirportSearchResult>();

    public readonly sortedAirports = ArraySubject.create<AmdbAirportSearchResult>();

    public readonly airportSearchMode = Subject.create(ControlPanelAirportSearchMode.Icao);

    public readonly airportSearchData = ArraySubject.create<string>();

    public readonly airportSearchSelectedAirportIndex = Subject.create(0);

    public readonly selectedAirport = Subject.create<AmdbAirportSearchResult | null>(null);

    public readonly isAirportSelectionPending = Subject.create(false);
}

enum ControlPanelAirportSearchMode {
    Icao,
    Iata,
    City,
}

export class ControlPanel extends DisplayComponent<ControlPanelProps> {
    private static readonly LAT_FORMATTER = DmsFormatter2.create('{dd}°{mm}.{s}{+[N]-[S]}', UnitType.DEGREE, 0.1);

    private static readonly LONG_FORMATTER = DmsFormatter2.create('{ddd}°{mm}.{s}{+[E]-[W]}', UnitType.DEGREE, 0.1);

    private readonly displayAirportButtonRef = FSComponent.createRef<HTMLButtonElement>();

    private readonly buttonRefs = [
        FSComponent.createRef<HTMLButtonElement>(),
        FSComponent.createRef<HTMLButtonElement>(),
        FSComponent.createRef<HTMLButtonElement>(),
    ];

    private readonly store = new ControlPanelStore();

    private readonly subscriptions: (Subscription | MappedSubscribable<any>)[] = [];

    private readonly style = MapSubject.create<string, string>();

    private readonly activeTabIndex = Subject.create<1 | 2 | 3>(2);

    onAfterRender() {
        this.displayAirportButtonRef.instance.addEventListener('click', () => this.handleDisplayAirport());

        this.buttonRefs[0].instance.addEventListener('click', () => this.handleSelectAirport('NZQN'));
        this.buttonRefs[1].instance.addEventListener('click', () => this.handleSelectAirport('LFPG'));
        this.buttonRefs[2].instance.addEventListener('click', () => this.handleSelectAirport('CYUL'));

        this.subscriptions.push(
            this.props.isVisible.sub((it) => this.style.setValue('visibility', it ? 'visible' : 'hidden'), true),
        );

        this.props.amdbClient.searchForAirports('').then((airports) => {
            this.store.airports.set(airports);
        });

        this.subscriptions.push(
            this.store.airports.sub(() => this.sotAirports(this.store.airportSearchMode.get())),
        );

        this.subscriptions.push(
            this.store.airportSearchMode.sub((mode) => this.sotAirports(mode)),
        );

        this.subscriptions.push(
            this.store.airportSearchMode.sub(() => this.updateAirportSearchData(), true),
            this.store.sortedAirports.sub(() => this.updateAirportSearchData(), true),
        );
    }

    public updateAirportSearchData() {
        const searchMode = this.store.airportSearchMode.get();
        const sortedAirports = this.store.sortedAirports.getArray();

        let prop: keyof AmdbAirportSearchResult;
        switch (searchMode) {
        default:
        case ControlPanelAirportSearchMode.Icao:
            prop = 'idarpt';
            break;
        case ControlPanelAirportSearchMode.Iata:
            prop = 'iata';
            break;
        case ControlPanelAirportSearchMode.City:
            prop = 'name';
            break;
        }

        this.store.airportSearchData.set(sortedAirports.filter((it) => it.iata !== null).map((it) => (it[prop] as string).toUpperCase()));
    }

    public setSelectedAirport(airport: AmdbAirportSearchResult) {
        this.store.selectedAirport.set(airport);
        this.store.airportSearchSelectedAirportIndex.set(this.store.sortedAirports.getArray().findIndex((it) => it.idarpt === airport.idarpt));
    }

    private sotAirports(mode: ControlPanelAirportSearchMode) {
        const array = this.store.airports.getArray().slice();

        let prop: keyof AmdbAirportSearchResult;
        switch (mode) {
        default:
        case ControlPanelAirportSearchMode.Icao:
            prop = 'idarpt';
            break;
        case ControlPanelAirportSearchMode.Iata:
            prop = 'iata';
            break;
        case ControlPanelAirportSearchMode.City:
            prop = 'name';
            break;
        }

        array.sort((a, b) => {
            if (a[prop] < b[prop]) {
                return -1;
            }
            if (a[prop] > b[prop]) {
                return 1;
            }
            return 0;
        });

        this.store.sortedAirports.set(array);
    }

    private handleSelectAirport = (icao: string, indexInSearchData?: number) => {
        const airport = this.store.airports.getArray().find((it) => it.idarpt === icao);

        if (!airport) {
            throw new Error('');
        }

        const airportIndexInSearchData = indexInSearchData ?? this.store.sortedAirports.getArray().findIndex((it) => it.idarpt === icao);

        this.store.airportSearchSelectedAirportIndex.set(airportIndexInSearchData);
        this.store.selectedAirport.set(airport);
        this.store.isAirportSelectionPending.set(true);
    }

    private handleDisplayAirport = () => {
        if (!this.store.selectedAirport.get()) {
            throw new Error('');
        }

        this.props.onSelectAirport(this.store.selectedAirport.get().idarpt);
        this.store.isAirportSelectionPending.set(false); // TODO should be done when airport is fully loaded
    }

    render(): VNode | null {
        return (
            <div class="oanc-control-panel-container" style={this.style}>
                <div class="oanc-control-panel-tabs" data-active-tab-index={this.activeTabIndex}>
                    <div class="oanc-control-panel-tabs-dummy" />
                    <ControlPanelTabButton
                        text="MAP DATA"
                        isSelected={this.activeTabIndex.map((it) => it === 1)}
                        onSelected={() => this.activeTabIndex.set(1)}
                    />
                    <ControlPanelTabButton
                        text="ARPT SEL"
                        isSelected={this.activeTabIndex.map((it) => it === 2)}
                        onSelected={() => this.activeTabIndex.set(2)}
                    />
                    <ControlPanelTabButton
                        text="STATUS"
                        isSelected={this.activeTabIndex.map((it) => it === 3)}
                        onSelected={() => this.activeTabIndex.set(3)}
                    />
                </div>

                <div class={{ 'oanc-control-panel': true, 'oanc-control-panel-tmpy': this.store.isAirportSelectionPending }}>
                    <div class="oanc-control-panel-arpt-sel-left">
                        <div class="oanc-control-panel-arpt-sel-left-dropdowns">
                            <div class="oanc-control-panel-arpt-sel-left-letter-dropdown">
                                <DropdownMenu
                                    values={ArraySubject.create('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))}
                                    selectedIndex={Subject.create(0)}
                                    freeTextAllowed={false}
                                    numberOfDigitsForInputField={1}
                                    idPrefix="oanc-search-letter"
                                />
                            </div>

                            <div class="oanc-control-panel-arpt-sel-left-airport-dropdown">
                                <DropdownMenu
                                    values={this.store.airportSearchData}
                                    selectedIndex={this.store.airportSearchSelectedAirportIndex}
                                    onModified={(newSelectedIndex) => {
                                        this.handleSelectAirport(this.store.sortedAirports.get(newSelectedIndex).idarpt, newSelectedIndex);
                                    }}
                                    freeTextAllowed={false}
                                    numberOfDigitsForInputField={1}
                                    idPrefix="oanc-search-airport"
                                />
                            </div>
                        </div>

                        <RadioButtonGroup
                            values={['ICAO', 'IATA', 'CITY NAME']}
                            selectedIndex={this.store.airportSearchMode}
                            idPrefix="oanc-search"
                        />
                    </div>

                    <div class="oanc-control-panel-arpt-sel-center">
                        <span class="oanc-control-panel-arpt-sel-center-info">{this.store.selectedAirport.map((it) => it?.name?.substring(0, 18).toUpperCase() ?? '')}</span>
                        <span class="oanc-control-panel-arpt-sel-center-info">
                            {this.store.selectedAirport.map((it) => {
                                if (!it) {
                                    return '';
                                }

                                return `${it.idarpt}       ${it.iata}`;
                            })}
                        </span>
                        <span class="oanc-control-panel-arpt-sel-center-info ">
                            {this.store.selectedAirport.map((it) => {
                                if (!it) {
                                    return '';
                                }

                                return `${ControlPanel.LAT_FORMATTER(it.coordinates.lat)}/${ControlPanel.LONG_FORMATTER(it.coordinates.lon)}`;
                            })}
                        </span>

                        <button ref={this.displayAirportButtonRef} type="button">DISPLAY ARPT</button>
                    </div>

                    <div class="oanc-control-panel-arpt-sel-right">
                        <button ref={this.buttonRefs[0]} type="button">NZQN</button>
                        <button ref={this.buttonRefs[1]} type="button">LFPG</button>
                        <button ref={this.buttonRefs[2]} type="button">CYUL</button>
                    </div>

                    <div class="oanc-control-panel-arpt-sel-close">
                        <button type="button"> </button>
                    </div>
                </div>
            </div>
        );
    }
}

interface ControlPanelTabButtonProps {
    text: string,

    isSelected: Subscribable<boolean>,

    onSelected: () => void,
}

class ControlPanelTabButton extends DisplayComponent<ControlPanelTabButtonProps> {
    private readonly root = FSComponent.createRef<HTMLDivElement>();

    onAfterRender() {
        this.root.instance.addEventListener('click', this.props.onSelected);
    }

    render(): VNode | null {
        return (
            <div
                ref={this.root}
                class={{
                    'oanc-control-panel-tab-button': true,
                    'oanc-control-panel-tab-button-selected': this.props.isSelected,
                }}
            >
                {this.props.text}
            </div>
        );
    }
}
