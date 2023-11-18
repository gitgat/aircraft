// Copyright (c) 2021-2023 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import { EventBus, FSComponent, HEventPublisher, InstrumentBackplane } from '@microsoft/msfs-sdk';
import { Oanc } from './Oanc';
import { FcuBusPublisher } from '../MsfsAvionicsCommon/providers/FcuBusPublisher';

import './styles.scss';

class A32NX_OANC extends BaseInstrument {
    private bus: EventBus;

    private readonly backplane = new InstrumentBackplane();

    private readonly fcuBusPublisher: FcuBusPublisher;

    private readonly hEventPublisher: HEventPublisher;

    /**
     * "mainmenu" = 0
     * "loading" = 1
     * "briefing" = 2
     * "ingame" = 3
     */
    private gameState = 0;

    private oancRef = FSComponent.createRef<Oanc>();

    constructor() {
        super();
        this.bus = new EventBus();
        this.fcuBusPublisher = new FcuBusPublisher(this.bus, 'L');
        this.hEventPublisher = new HEventPublisher(this.bus);
    }

    get templateID(): string {
        return 'A32NX_OANC';
    }

    get isInteractive(): boolean {
        return true;
    }

    public onInteractionEvent(args: string[]): void {
        this.hEventPublisher.dispatchHEvent(args[0]);
    }

    public connectedCallback(): void {
        super.connectedCallback();

        this.backplane.addPublisher('fcu', this.fcuBusPublisher);
        this.backplane.addPublisher('hEvent', this.hEventPublisher);

        this.backplane.init();

        FSComponent.render(<Oanc bus={this.bus} ref={this.oancRef} />, document.getElementById('OANC_CONTENT'));

        // Remove "instrument didn't load" text
        document.getElementById('OANC_CONTENT').querySelector(':scope > h1').remove();
    }

    public Update(): void {
        super.Update();

        if (this.gameState !== 3) {
            const gamestate = this.getGameState();
            if (gamestate === 3) {
                this.backplane.onUpdate();
            }
            this.gameState = gamestate;
        } else {
            this.backplane.onUpdate();
        }

        if (this.oancRef.getOrDefault()) {
            this.oancRef.instance.Update();
        }
    }
}

registerInstrument('a32nx-oanc', A32NX_OANC);
