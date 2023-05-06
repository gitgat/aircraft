// Copyright (c) 2021-2023 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import { Arrival } from 'msfs-navdata';
import { FlightPlanElement, FlightPlanLeg } from '@fmgc/flightplanning/new/legs/FlightPlanLeg';
import { BaseFlightPlan, FlightPlanQueuedOperation } from '@fmgc/flightplanning/new/plans/BaseFlightPlan';
import { SegmentClass } from '@fmgc/flightplanning/new/segments/SegmentClass';
import { ProcedureSegment } from '@fmgc/flightplanning/new/segments/ProcedureSegment';
import { NavigationDatabaseService } from '../NavigationDatabaseService';

export class ArrivalSegment extends ProcedureSegment<Arrival> {
    class = SegmentClass.Arrival

    allLegs: FlightPlanElement[] = []

    public get procedure(): Arrival | undefined {
        return this.arrival;
    }

    private arrival: Arrival | undefined

    async setProcedure(procedureIdent: string, skipUpdateLegs = true) {
        if (procedureIdent === undefined) {
            this.arrival = undefined;

            if (!skipUpdateLegs) {
                this.allLegs.length = 0;
                await this.flightPlan.arrivalEnrouteTransitionSegment.setProcedure(undefined);

                this.flightPlan.syncSegmentLegsChange(this);
            }

            return;
        }

        const db = NavigationDatabaseService.activeDatabase.backendDatabase;

        const { destinationAirport, destinationRunway } = this.flightPlan.destinationSegment;

        if (!destinationAirport || !destinationRunway) {
            throw new Error('[FMS/FPM] Cannot set approach without destination airport and runway');
        }

        const arrivals = await db.getArrivals(destinationAirport.ident);

        const matchingArrival = arrivals.find((arrival) => arrival.ident === procedureIdent);

        if (!matchingArrival) {
            throw new Error(`[FMS/FPM] Can't find arrival procedure '${procedureIdent}' for ${destinationAirport.ident}`);
        }

        if (skipUpdateLegs) {
            return;
        }

        const legs = [...matchingArrival.commonLegs];

        this.arrival = matchingArrival;
        this.allLegs.length = 0;
        this.strung = false;

        const mappedArrivalLegs = legs.map((leg) => FlightPlanLeg.fromProcedureLeg(this, leg, matchingArrival.ident));
        this.allLegs.push(...mappedArrivalLegs);

        await this.flightPlan.arrivalRunwayTransitionSegment.setProcedure(destinationRunway.ident);

        this.flightPlan.syncSegmentLegsChange(this);
        this.flightPlan.enqueueOperation(FlightPlanQueuedOperation.RebuildArrivalAndApproach);
        this.flightPlan.enqueueOperation(FlightPlanQueuedOperation.Restring);
    }

    clone(forPlan: BaseFlightPlan): ArrivalSegment {
        const newSegment = new ArrivalSegment(forPlan);

        newSegment.strung = this.strung;
        newSegment.allLegs = [...this.allLegs.map((it) => (it.isDiscontinuity === false ? it.clone(newSegment) : it))];
        newSegment.arrival = this.arrival;

        return newSegment;
    }
}
