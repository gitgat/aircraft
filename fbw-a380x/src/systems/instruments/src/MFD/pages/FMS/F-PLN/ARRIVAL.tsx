import { FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './f-pln.scss';
import { AbstractMfdPageProps } from 'instruments/src/MFD/MFD';
import { Footer } from 'instruments/src/MFD/pages/common/Footer';
import { Button, ButtonMenuItem } from 'instruments/src/MFD/pages/common/Button';
import { FmsPage } from 'instruments/src/MFD/pages/common/FmsPage';

interface MfdFmsFplnArrProps extends AbstractMfdPageProps {
}

export class MfdFmsFplnArr extends FmsPage<MfdFmsFplnArrProps> {
    private toIcao = Subject.create<string>('');

    private rwyLs = Subject.create<string>('');

    private rwyIdent = Subject.create<string>('');

    private rwyLength = Subject.create<string>('');

    private rwyCrs = Subject.create<string>('');

    private appr = Subject.create<string>('');

    private rwyFreq = Subject.create<string>('');

    private via = Subject.create<string>('');

    private star = Subject.create<string>('');

    private trans = Subject.create<string>('');

    private rwyOptions = Subject.create<ButtonMenuItem[]>([]);

    private apprDisabled = Subject.create<boolean>(false);

    private apprOptions = Subject.create<ButtonMenuItem[]>([]);

    private viaDisabled = Subject.create<boolean>(false);

    private viaOptions = Subject.create<ButtonMenuItem[]>([]);

    private starDisabled = Subject.create<boolean>(false);

    private starOptions = Subject.create<ButtonMenuItem[]>([]);

    private transDisabled = Subject.create<boolean>(false);

    private transOptions = Subject.create<ButtonMenuItem[]>([]);

    private tmpyInsertButtonDiv = FSComponent.createRef<HTMLDivElement>();

    protected onNewData(): void {
        console.time('ARRIVAL:onNewData');
        this.currentFlightPlanVersion = this.loadedFlightPlan.version;

        if (this.loadedFlightPlan.originAirport) {
            this.toIcao.set(this.loadedFlightPlan.originAirport.ident);

            const runways: ButtonMenuItem[] = [];
            this.loadedFlightPlan.availableDestinationRunways.forEach((rw) => {
                runways.push({
                    label: `${rw.ident.substring(2).padEnd(3, ' ')} ${rw.length.toFixed(0).padStart(5, ' ')}FT`,
                    action: () => {
                        this.props.flightPlanService.setDestinationRunway(rw.ident);
                        this.props.flightPlanService.setApproach(undefined);
                        this.props.flightPlanService.setApproachVia(undefined);
                        this.props.flightPlanService.setArrival(undefined);
                        this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                    },
                });
            });
            this.rwyOptions.set(runways);

            if (this.loadedFlightPlan.destinationRunway) {
                this.rwyIdent.set(this.loadedFlightPlan.destinationRunway.ident.substring(2));
                this.rwyLength.set(this.loadedFlightPlan.destinationRunway.length.toFixed(0) ?? '----');
                this.rwyCrs.set(this.loadedFlightPlan.destinationRunway.bearing.toFixed(0) ?? '---');

                if (this.loadedFlightPlan.availableApproaches?.length > 0) {
                    const appr: ButtonMenuItem[] = [{
                        label: 'NONE',
                        action: () => {
                            this.props.flightPlanService.setApproach(undefined);
                            this.props.flightPlanService.setApproachVia(undefined);
                            this.props.flightPlanService.setArrival(undefined);
                            this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                        },
                    }];
                    this.loadedFlightPlan.availableDepartures.forEach((el) => {
                        appr.push({
                            label: el.ident,
                            action: () => {
                                this.props.flightPlanService.setApproach(el.ident);
                                this.props.flightPlanService.setApproachVia(undefined);
                                this.props.flightPlanService.setArrival(undefined);
                                this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                            },
                        });
                    });
                    this.apprOptions.set(appr);
                    this.apprDisabled.set(false);
                }
            } else {
                this.rwyIdent.set('---');
                this.rwyLength.set('----');
                this.rwyCrs.set('---');
                this.apprDisabled.set(true);
            }

            if (this.loadedFlightPlan.approach) {
                this.appr.set(this.loadedFlightPlan.approach.ident);

                if (this.loadedFlightPlan.availableApproachVias?.length > 0) {
                    const vias: ButtonMenuItem[] = [{
                        label: 'NONE',
                        action: () => {
                            this.props.flightPlanService.setApproachVia(undefined);
                            this.props.flightPlanService.setArrival(undefined);
                            this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                        },
                    }];
                    this.loadedFlightPlan.availableApproachVias.forEach((el) => {
                        vias.push({
                            label: el.ident,
                            action: () => {
                                this.props.flightPlanService.setApproachVia(el.ident);
                                this.props.flightPlanService.setArrival(undefined);
                                this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                            },
                        });
                    });
                    this.viaOptions.set(vias);
                    this.viaDisabled.set(false);
                }
            } else {
                if (this.loadedFlightPlan.availableApproaches?.length > 0) {
                    this.appr.set('------');
                } else {
                    this.appr.set('NONE');
                }
                this.viaDisabled.set(true);
            }

            if (this.loadedFlightPlan.approachVia) {
                this.via.set(this.loadedFlightPlan.approachVia.ident);

                if (this.loadedFlightPlan.availableArrivals?.length > 0) {
                    const arrivals: ButtonMenuItem[] = [{
                        label: 'NONE',
                        action: () => {
                            this.props.flightPlanService.setArrival(undefined);
                            this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                        },
                    }];
                    this.loadedFlightPlan.availableArrivals.forEach((el) => {
                        arrivals.push({
                            label: el.ident,
                            action: () => {
                                this.props.flightPlanService.setArrival(el.ident);
                                this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                            },
                        });
                    });
                    this.starOptions.set(arrivals);
                    this.starDisabled.set(false);
                }
            } else {
                if (this.loadedFlightPlan.availableApproachVias?.length > 0) {
                    this.via.set('------');
                } else {
                    this.via.set('NONE');
                }
                this.starDisabled.set(true);
            }

            if (this.loadedFlightPlan.arrival) {
                this.star.set(this.loadedFlightPlan.arrival.ident);

                if (this.loadedFlightPlan.arrival.enrouteTransitions?.length > 0) {
                    const trans: ButtonMenuItem[] = [{
                        label: 'NONE',
                        action: () => {
                            this.props.flightPlanService.setArrivalEnrouteTransition(undefined);
                        },
                    }];
                    this.loadedFlightPlan.arrival.enrouteTransitions.forEach((el) => {
                        trans.push({
                            label: el.ident,
                            action: () => {
                                this.props.flightPlanService.setArrivalEnrouteTransition(el.ident);
                            },
                        });
                    });
                    this.transOptions.set(trans);
                    this.transDisabled.set(false);
                }
            } else {
                if (this.loadedFlightPlan.availableArrivals?.length > 0) {
                    this.star.set('------');
                } else {
                    this.star.set('NONE');
                }
                this.transDisabled.set(true);
            }

            if (this.loadedFlightPlan.arrivalEnrouteTransition) {
                this.trans.set(this.loadedFlightPlan.arrivalEnrouteTransition.ident);
            } else if (this.loadedFlightPlan?.arrival?.enrouteTransitions?.length === 0) {
                this.trans.set('NONE');
            } else {
                this.trans.set('------');
            }
        } else {
            this.toIcao.set('----');
        }

        this.tmpyActive.set(this.props.flightPlanService.hasTemporary);
        console.timeEnd('ARRIVAL:onNewData');
    }

    public onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        this.subs.push(this.tmpyActive.sub((v) => this.tmpyInsertButtonDiv.getOrDefault().style.visibility = (v ? 'visible' : 'hidden'), true));
    }

    public destroy(): void {
        // Destroy all subscriptions to remove all references to this instance.
        this.subs.forEach((x) => x.destroy());

        super.destroy();
    }

    render(): VNode {
        return (
            <>
                {super.render()}
                {/* begin page content */}
                <div class="mfd-fms-fpln-labeled-box-container">
                    <span class="mfd-label mfd-spacing-right mfd-fms-fpln-labeled-box-label">
                        SELECTED ARRIVAL
                    </span>
                    <div class="mfd-fms-fpln-label-bottom-space" style="display: flex; flex-direction: row; align-items: center;">
                        <div style="flex: 0.2; display: flex; flex-direction: row; align-items: center;">
                            <span class="mfd-label mfd-spacing-right">TO</span>
                            <span class={{
                                'mfd-value-green': true,
                                'mfd-value-tmpy': this.tmpyActive,
                                'mfd-value-sec': this.secActive,
                            }}
                            >
                                {this.toIcao}
                            </span>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">LS</span>
                            <span class={{
                                'mfd-value-green': true,
                                'mfd-value-tmpy': this.tmpyActive,
                                'mfd-value-sec': this.secActive,
                            }}
                            >
                                {this.rwyLs}
                            </span>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">RWY</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.rwyIdent}
                                </span>
                            </div>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">LENGTH</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.rwyLength}
                                </span>
                                <span class="mfd-label-unit mfd-unit-trailing">FT</span>
                            </div>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">CRS</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.rwyCrs}
                                </span>
                                <span class="mfd-label-unit mfd-unit-trailing">°</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: row; align-items: center;">
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">APPR</span>
                            <span class={{
                                'mfd-value-green': true,
                                'mfd-value-tmpy': this.tmpyActive,
                                'mfd-value-sec': this.secActive,
                            }}
                            >
                                {this.appr}
                            </span>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">FREQ/CHAN</span>
                            <span class={{
                                'mfd-value-green': true,
                                'mfd-value-tmpy': this.tmpyActive,
                                'mfd-value-sec': this.secActive,
                            }}
                            >
                                {this.rwyFreq}
                            </span>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">VIA</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.via}
                                </span>
                            </div>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">STAR</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.star}
                                </span>
                            </div>
                        </div>
                        <div style="flex: 0.2; display: flex; flex-direction: column;">
                            <span class="mfd-label mfd-fms-fpln-label-bottom-space">TRANS</span>
                            <div>
                                <span class={{
                                    'mfd-value-green': true,
                                    'mfd-value-tmpy': this.tmpyActive,
                                    'mfd-value-sec': this.secActive,
                                }}
                                >
                                    {this.trans}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                    <Button
                        label="RWY"
                        onClick={() => null}
                        buttonStyle="width: 190px;"
                        idPrefix="f-pln-arr-rwy-btn"
                        menuItems={this.rwyOptions}
                    />
                    <Button
                        label="APPR"
                        onClick={() => null}
                        disabled={this.apprDisabled}
                        buttonStyle="width: 160px;"
                        idPrefix="f-pln-arr-appr-btn"
                        menuItems={this.apprOptions}
                    />
                    <Button
                        label="VIA"
                        onClick={() => null}
                        disabled={this.viaDisabled}
                        buttonStyle="width: 125px;"
                        idPrefix="f-pln-arr-via-btn"
                        menuItems={this.viaOptions}
                    />
                    <Button
                        label="STAR"
                        onClick={() => null}
                        disabled={this.starDisabled}
                        buttonStyle="width: 125px;"
                        idPrefix="f-pln-arr-star-btn"
                        menuItems={this.starOptions}
                    />
                    <Button
                        label="TRANS"
                        onClick={() => null}
                        disabled={this.transDisabled}
                        buttonStyle="width: 125px;"
                        idPrefix="f-pln-arr-trans-btn"
                        menuItems={this.transOptions}
                    />
                </div>
                <div style="flex-grow: 1;" />
                <div ref={this.tmpyInsertButtonDiv} style="display: flex; justify-content: flex-end; padding: 2px;">
                    <Button
                        label="TMPY F-PLN"
                        onClick={() => {
                            this.props.flightPlanService.temporaryInsert().then(() => this.props.uiService.navigateTo(`fms/${this.props.uiService.activeUri.get().category}/f-pln`));
                        }}
                        buttonStyle="color: yellow"
                    />
                </div>
                {/* end page content */}
                <Footer bus={this.props.bus} uiService={this.props.uiService} flightPlanService={this.props.flightPlanService} />
            </>
        );
    }
}
