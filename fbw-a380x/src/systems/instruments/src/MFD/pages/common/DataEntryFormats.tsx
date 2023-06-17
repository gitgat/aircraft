import { Subject, Subscribable } from '@microsoft/msfs-sdk';
import { Mmo } from 'shared/constants';

type FieldFormatTuple = [value: string, unitLeading: string, unitTrailing: string];
export interface DataEntryFormat<T> {
    placeholder: string;
    maxDigits: number;
    format(value: T): FieldFormatTuple;
    parse(input: string): Promise<T | null>;
    /**
     * If modified or notify()ed, triggers format() in the input field (i.e. when dependencies to value have changed)
     */
    reFormatTrigger?: Subscribable<boolean>;
}

export class SpeedKnotsFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'KT'] as FieldFormatTuple;
        }
        return [value.toString(), null, 'KT'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class SpeedMachFormat implements DataEntryFormat<number> {
    public placeholder = '.--';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, null] as FieldFormatTuple;
        }
        return [`.${value.toFixed(2).split('.')[1]}`, null, null] as FieldFormatTuple;
    }

    public async parse(input: string) {
        let nbr = Number(input);
        if (nbr > Mmo && !input.search('.')) {
            nbr = Number(`0.${input}`);
        }
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return nbr;
        }
        return null;
    }
}

// Assumption: All values between 0 and 430 are FL, above are FT (TODO check corner cases)
export class AltitudeOrFlightLevelFormat implements DataEntryFormat<number> {
    public placeholder = '-----';

    public maxDigits = 5;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    private transAlt: number;

    reFormatTrigger = Subject.create(false);

    constructor(minValue: Subscribable<number> = Subject.create(0),
        maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY),
        transAlt: Subscribable<number> = Subject.create(18000)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);

        transAlt.sub((val) => {
            this.transAlt = val;
            this.reFormatTrigger.notify();
        });
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'FT'] as FieldFormatTuple;
        }
        if (value >= this.transAlt) {
            return [(value / 100).toFixed(0).toString().padStart(3, '0'), 'FL', null] as FieldFormatTuple;
        }
        return [value.toFixed(0).toString(), null, 'FT'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        let nbr = Number(input);
        if (nbr < 430) {
            nbr = Number(input) * 100;
        }
        if (Number.isNaN(nbr) === false && (nbr >= this.minValue && nbr <= this.maxValue)) {
            return nbr;
        }
        return null;
    }
}

export class AltitudeFormat implements DataEntryFormat<number> {
    public placeholder = '-----';

    public maxDigits = 5;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'FT'] as FieldFormatTuple;
        }
        return [value.toFixed(0).toString(), null, 'FT'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

// Unit of value: Feet (i.e. FL * 100)
export class FlightLevelFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, 'FL', null] as FieldFormatTuple;
        }
        const fl = Math.round(value / 100);
        return [fl.toFixed(0).toString().padStart(3, '0'), 'FL', null] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= (this.maxValue / 100) && nbr >= (this.minValue / 100)) {
            return Number(input) * 100; // Convert FL to feet
        }
        return null;
    }
}

export class LengthFormat implements DataEntryFormat<number> {
    public placeholder = '----';

    public maxDigits = 4;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'M'] as FieldFormatTuple;
        }
        return [value.toString(), null, 'M'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class WeightFormat implements DataEntryFormat<number> {
    public placeholder = '---.-';

    public maxDigits = 5;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'T'] as FieldFormatTuple;
        }
        return [value.toFixed(1), null, 'T'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class PercentageFormat implements DataEntryFormat<number> {
    public placeholder = '--.-';

    public maxDigits = 4;

    public isValidating = Subject.create(false);

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, '%'] as FieldFormatTuple;
        }
        return [value.toFixed(1), null, '%'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class TemperatureFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, '°C'] as FieldFormatTuple;
        }
        if (value >= 0) {
            return [`+${value.toFixed(0).toString()}`, null, '°C'] as FieldFormatTuple;
        }
        return [value.toFixed(0).toString(), null, '°C'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class WindDirectionFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = 359;

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, '°C'] as FieldFormatTuple;
        }
        return [value.toFixed(0).toString().padStart(3, '0'), null, '°C'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class WindSpeedFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 3;

    private minValue = 0;

    private maxValue = 250;

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'KT'] as FieldFormatTuple;
        }
        return [value.toFixed(0).toString().padStart(3, '0'), null, 'KT'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class QnhFormat implements DataEntryFormat<number> {
    public placeholder = '----';

    public maxDigits = 4;

    private minHpaValue = 745;

    private maxHpaValue = 1100;

    private minInHgValue = 22.00;

    private maxInHgValue = 32.48;

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, null] as FieldFormatTuple;
        }
        return [value.toString(), null, null] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && (nbr >= this.minHpaValue && nbr <= this.maxHpaValue) || (nbr >= this.minInHgValue && nbr <= this.maxInHgValue)) {
            return Number(input);
        }
        return null;
    }
}

export class CostIndexFormat implements DataEntryFormat<number> {
    public placeholder = '--';

    public maxDigits = 2;

    private minValue = 0;

    private maxValue = 999; // DSC-22-FMS-20-100

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, null] as FieldFormatTuple;
        }
        return [value.toString(), null, null] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class VerticalSpeedFormat implements DataEntryFormat<number> {
    public placeholder = '---';

    public maxDigits = 4;

    private minValue = 0;

    private maxValue = Number.POSITIVE_INFINITY;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'FT/MN'] as FieldFormatTuple;
        }
        return [value.toString(), null, 'FT/MN'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        const nbr = Number(input);
        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return Number(input);
        }
        return null;
    }
}

export class DescentRateFormat implements DataEntryFormat<number> {
    public placeholder = '----';

    public maxDigits = 4;

    private minValue = Number.NEGATIVE_INFINITY;

    private maxValue = 0;

    constructor(minValue: Subscribable<number> = Subject.create(0), maxValue: Subscribable<number> = Subject.create(Number.POSITIVE_INFINITY)) {
        minValue.sub((val) => this.minValue = val, true);
        maxValue.sub((val) => this.maxValue = val, true);
    }

    public format(value: number) {
        if (!value) {
            return [this.placeholder, null, 'FT/MN'] as FieldFormatTuple;
        }
        return [value.toString(), null, 'FT/MN'] as FieldFormatTuple;
    }

    public async parse(input: string) {
        let nbr = Number(input);

        if (nbr > 0) {
            nbr *= (-1);
        }

        if (Number.isNaN(nbr) === false && nbr <= this.maxValue && nbr >= this.minValue) {
            return nbr;
        }
        return null;
    }
}

export class AirportFormat implements DataEntryFormat<string> {
    public placeholder = '----';

    public maxDigits = 4;

    public format(value: string) {
        if (!value) {
            return [this.placeholder, null, null] as FieldFormatTuple;
        }
        return [value, null, null] as FieldFormatTuple;
    }

    public async parse(input: string) {
        return input;
    }
}

// TODO add coordinate types
