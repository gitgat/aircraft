// Copyright (c) 2021-2022 FlyByWire Simulations
// Copyright (c) 2021-2022 Synaptic Simulations
//
// SPDX-License-Identifier: GPL-3.0

/* eslint-disable no-await-in-loop */

import { FlightPlanService } from '@fmgc/flightplanning/new/FlightPlanService';
import { FlightPlanIndex } from '@fmgc/flightplanning/new/FlightPlanManager';
import { NavigationDatabaseService } from '@fmgc/flightplanning/new/NavigationDatabaseService';
import { Fix, Airway } from '@flybywiresim/fbw-sdk';
import { Coordinates, distanceTo } from 'msfs-geo';
import { DisplayInterface } from '@fmgc/flightplanning/new/interface/DisplayInterface';
import type { Fix as CoRouteFix } from '@simbridge/Coroute/Fix';
import { DataInterface } from '../interface/DataInterface';

export interface OfpRoute {
    from: string,
    to: string,
    altn: string,
    chunks: OfpRouteChunk[],
}

export interface BaseOfpRouteChunk {
    instruction: string,
}

interface AirwayOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'airway',
    ident: string,
    locationHint: {
        lat: number,
        long: number,
    },
}

interface AirwayTerminationOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'airwayTermination',
    ident: string,
}

interface WaypointOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'waypoint',
    ident: string,
    locationHint: {
        lat: number,
        long: number,
    },
}

interface LatLongOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'latlong',
    lat: number,
    long: number,
}

interface DctOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'dct',
}

interface ProcedureOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'procedure',
    ident: string,
}

interface SidEnrouteTransitionOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'sidEnrouteTransition',
    ident: string,
    locationHint: {
        lat: number,
        long: number,
    },
}

interface StarEnrouteTransitionOfpRouteChunk extends BaseOfpRouteChunk {
    instruction: 'starEnrouteTransition',
    ident: string,
}

type OfpRouteChunk =
    | AirwayOfpRouteChunk
    | AirwayTerminationOfpRouteChunk
    | WaypointOfpRouteChunk
    | LatLongOfpRouteChunk
    | DctOfpRouteChunk
    | ProcedureOfpRouteChunk
    | SidEnrouteTransitionOfpRouteChunk
    | StarEnrouteTransitionOfpRouteChunk

type CoRoute = {
    routeNumber: string,
    originIcao: string,
    destinationIcao: string,
    route: string,
    /* eslint-disable camelcase */
    alternateIcao?: string
    navlog: CoRouteFix[],
}

export class CoRouteUplinkAdapter {
    static async uplinkFlightPlanFromCoRoute(fms: DataInterface & DisplayInterface, flightPlanService: FlightPlanService, ofp: CoRoute) {
        const route = this.getRouteFromOfp(ofp);

        fms.onUplinkInProgress();

        await flightPlanService.newCityPair(route.from, route.to, route.altn, FlightPlanIndex.Uplink);

        let insertHead = -1;

        const setInsertHeadToEndOfEnroute = () => {
            insertHead = flightPlanService.uplink.originSegment.legCount
                + flightPlanService.uplink.departureRunwayTransitionSegment.legCount
                + flightPlanService.uplink.departureSegment.legCount
                + flightPlanService.uplink.departureEnrouteTransitionSegment.legCount
                + flightPlanService.uplink.enrouteSegment.legCount
                - 1;

            if (flightPlanService.uplink.enrouteSegment.legCount > 0) {
                const lastElement = flightPlanService.uplink.allLegs[insertHead];

                if (lastElement?.isDiscontinuity === true) {
                    insertHead--;
                }
            }
        };

        setInsertHeadToEndOfEnroute();

        const ensureAirwaysFinalized = () => {
            if (flightPlanService.uplink.pendingAirways) {
                flightPlanService.uplink.pendingAirways.finalize();
                flightPlanService.uplink.pendingAirways = undefined;

                setInsertHeadToEndOfEnroute();
            }
        };

        const pickFix = (fixes: Fix[], locationHint: Coordinates): Fix => {
            let minDistance = Number.MAX_SAFE_INTEGER;
            let minDistanceIndex = -1;

            for (let i = 0; i < fixes.length; i++) {
                const fix = fixes[i];

                const distance = distanceTo(fix.location, locationHint);

                if (distance < minDistance) {
                    minDistance = distance;
                    minDistanceIndex = i;
                }
            }

            return fixes[minDistanceIndex];
        };

        const pickAirway = (airways: Airway[], locationHint: Coordinates): Airway => {
            let minDistance = Number.MAX_SAFE_INTEGER;
            let minDistanceIndex = -1;

            for (let i = 0; i < airways.length; i++) {
                const airway = airways[i];

                const distance = distanceTo(airway.fixes[0].location, locationHint);

                if (distance < minDistance) {
                    minDistance = distance;
                    minDistanceIndex = i;
                }
            }

            return airways[minDistanceIndex];
        };

        const pickAirwayFix = (airway: Airway, fixes: Fix[]): Fix => fixes.find((it) => airway.fixes.some((fix) => fix.ident === it.ident && fix.icaoCode === it.icaoCode));

        for (let i = 0; i < route.chunks.length; i++) {
            const chunk = route.chunks[i];

            switch (chunk.instruction) {
            case 'procedure': {
                continue;
            }
            case 'sidEnrouteTransition': {
                const fixes = await NavigationDatabaseService.activeDatabase.searchAllFix(chunk.ident);

                if (fixes.length > 0) {
                    await flightPlanService.nextWaypoint(insertHead, fixes.length > 1 ? pickFix(fixes, chunk.locationHint) : fixes[0], FlightPlanIndex.Uplink);
                    insertHead++;
                } else {
                    throw new Error(`[SimBriefUplinkAdapter](uplinkFlightPlanFromSimbrief) Found no fixes for "sidEnrouteTransition" chunk: ${chunk.ident}`);
                }

                continue;
            }
            case 'waypoint': {
                if (insertHead === -1) {
                    setInsertHeadToEndOfEnroute();
                }

                const fixes = await NavigationDatabaseService.activeDatabase.searchAllFix(chunk.ident);

                if (fixes.length > 0) {
                    await flightPlanService.nextWaypoint(insertHead, fixes.length > 1 ? pickFix(fixes, chunk.locationHint) : fixes[0], FlightPlanIndex.Uplink);
                    insertHead++;
                } else {
                    throw new Error(`[CoRouteUplinkAdapter](uplinkFlightPlanFromCoRoute) Found no fixes for "waypoint" chunk: ${chunk.ident}`);
                }

                break;
            }

            case 'latlong': {
                if (insertHead === -1) {
                    setInsertHeadToEndOfEnroute();
                }

                const storedWaypoint = fms.createLatLonWaypoint({ lat: chunk.lat, long: chunk.long }, true);

                await flightPlanService.nextWaypoint(insertHead, storedWaypoint.waypoint, FlightPlanIndex.Uplink);
                insertHead++;
                break;
            }
            case 'airway': {
                const plan = flightPlanService.uplink;

                let airwaySearchFix: Fix;
                if (!plan.pendingAirways) {
                    plan.startAirwayEntry(insertHead);

                    const legAtInsertHead = plan.elementAt(insertHead);

                    if (legAtInsertHead.isDiscontinuity === false) {
                        airwaySearchFix = legAtInsertHead.terminationWaypoint();
                    }
                } else {
                    const tailElement = plan.pendingAirways.elements[plan.pendingAirways.elements.length - 1];

                    airwaySearchFix = tailElement.to ?? tailElement.airway?.fixes[tailElement.airway.fixes.length - 1];
                }

                if (airwaySearchFix) {
                    const airways = await NavigationDatabaseService.activeDatabase.searchAirway(chunk.ident, airwaySearchFix);

                    if (airways.length > 0) {
                        plan.pendingAirways.thenAirway(pickAirway(airways, chunk.locationHint));
                    } else {
                        throw new Error(`[CoRouteUplinkAdapter](uplinkFlightPlanFromCoRoute) Found no airways at fix "${airwaySearchFix.ident}" for "airway" chunk: ${chunk.ident}`);
                    }
                } else {
                    throw new Error(`[CoRouteUplinkAdapter](uplinkFlightPlanFromCoRoute) Found no search fix for "airway" chunk: ${chunk.ident}`);
                }

                break;
            }
            case 'airwayTermination': {
                const plan = flightPlanService.uplink;

                if (!plan.pendingAirways) {
                    plan.startAirwayEntry(insertHead);
                }

                const tailAirway = plan.pendingAirways.elements[plan.pendingAirways.elements.length - 1].airway;

                const fixes = await NavigationDatabaseService.activeDatabase.searchAllFix(chunk.ident);

                if (fixes.length > 0) {
                    plan.pendingAirways.thenTo(pickAirwayFix(tailAirway, fixes));

                    ensureAirwaysFinalized();
                } else {
                    throw new Error(`[CoRouteUplinkAdapter](uplinkFlightPlanFromCoRoute) Found no fixes for "airwayTermination" chunk: ${chunk.ident}`);
                }

                break;
            }
            default:
                console.error(`Unknown route instruction: ${chunk.instruction}`);
            }
        }

        fms.onUplinkDone();
    }

    static getRouteFromOfp(ofp: CoRoute): OfpRoute {
        return {
            from: ofp.originIcao,
            to: ofp.destinationIcao,
            altn: ofp.alternateIcao,
            chunks: this.generateRouteInstructionsFromNavlog(ofp),
        };
    }

    static generateRouteInstructionsFromNavlog(ofp: CoRoute): OfpRouteChunk[] {
        const instructions: OfpRouteChunk[] = [];

        for (let i = 0; i < ofp.navlog.length; i++) {
            const lastFix = ofp.navlog[i - 1];
            const fix = ofp.navlog[i];

            if (fix.ident === 'TOC' || fix.ident === 'TOD' || fix.type === 'apt') {
                continue;
            }

            const lastInstruction = instructions[instructions.length - 1];

            if (fix.is_sid_star === '1') {
                // SID/STAR

                if (!lastInstruction) {
                    instructions.push({ instruction: 'procedure', ident: fix.via_airway.toString() });
                } else if (lastInstruction.instruction !== 'procedure') {
                    instructions.push({ instruction: 'procedure', ident: fix.via_airway.toString() });
                }
            } else if (lastInstruction?.instruction === 'procedure' && lastInstruction.ident === fix.via_airway) {
                // SID TRANS
                instructions.push(
                    { instruction: 'sidEnrouteTransition', ident: fix.ident.toString(), locationHint: { lat: parseFloat(fix.pos_lat.toString()), long: parseFloat(fix.pos_long.toString()) } },
                );
            } else if (fix.via_airway === 'DCT' || fix.via_airway === 'DCT*' || fix.via_airway.match(/^NAT[A-Z]$/)) {
                if (fix.type === 'ltlg') {
                    // LAT/LONG Waypoint
                    instructions.push({ instruction: 'latlong', lat: parseFloat(fix.pos_lat.toString()), long: parseFloat(fix.pos_long.toString()) });
                } else {
                    // DCT Waypoint
                    instructions.push(
                        { instruction: 'waypoint', ident: fix.ident.toString(), locationHint: { lat: parseFloat(fix.pos_lat.toString()), long: parseFloat(fix.pos_long.toString()) } },
                    );
                }
            } else if (!(lastInstruction && lastInstruction.instruction === 'airway' && lastInstruction.ident === fix.via_airway)) {
                if (lastFix && lastInstruction && lastInstruction.instruction === 'airway' && fix.via_airway !== lastFix.via_airway) {
                    instructions.push({ instruction: 'airwayTermination', ident: lastFix.ident.toString() });
                }

                // Airway
                instructions.push(
                    { instruction: 'airway', ident: fix.via_airway.toString(), locationHint: { lat: parseFloat(fix.pos_lat.toString()), long: parseFloat(fix.pos_long.toString()) } },
                );
            }

            if (instructions[instructions.length - 1]?.instruction === 'airway' && ofp.navlog[i + 1]?.via_airway !== fix.via_airway.toString()) {
                // End of airway
                instructions.push({ instruction: 'airwayTermination', ident: fix.ident.toString() });
            }
        }

        return instructions;
    }
}
