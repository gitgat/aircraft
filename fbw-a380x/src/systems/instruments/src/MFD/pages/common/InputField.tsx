import { ComponentProps, DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';
import './style.scss';
import { DataEntryFormat } from 'instruments/src/MFD/pages/common/DataEntryFormats';

// eslint-disable-next-line max-len
export const emptyMandatoryCharacter = (selected: boolean) => `<svg width="16" height="23" viewBox="1 1 13 23"><polyline points="2,2 2,22 13,22 13,2 2,2" fill="none" stroke=${selected ? 'black' : '#e68000'} stroke-width="2" /></svg>`;

interface InputFieldProps<T> extends ComponentProps {
    dataEntryFormat: DataEntryFormat<T>;
    isMandatory: boolean;
    value: Subject<T>;
    containerStyle?: string;
}

export class InputField<T> extends DisplayComponent<InputFieldProps<T>> {
    private topRef = FSComponent.createRef<HTMLDivElement>();

    private spanningDivRef = FSComponent.createRef<HTMLDivElement>();

    private textInputRef = FSComponent.createRef<HTMLSpanElement>();

    private caretRef = FSComponent.createRef<HTMLSpanElement>();

    private leadingUnitRef = FSComponent.createRef<HTMLSpanElement>();

    private trailingUnitRef = FSComponent.createRef<HTMLSpanElement>();

    private modifiedFieldValue = Subject.create<string>(null);

    private isFocused = Subject.create(false);

    private isValidating = Subject.create(false);

    private onNewValue() {
        // If currently editing, blur field
        // Reset modifiedFieldValue
        if (this.modifiedFieldValue.get() !== null) {
            this.textInputRef.getOrDefault().blur();
            this.modifiedFieldValue.set(null);
        } else {
            this.updateDisplayElement();
        }
    }

    private updateDisplayElement() {
        // If modifiedFieldValue.get() === null, render props' value
        if (this.modifiedFieldValue.get() === null) {
            if (!this.props.value.get()) {
                this.populatePlaceholders();
            } else {
                this.textInputRef.getOrDefault().innerText = this.props.dataEntryFormat.format(this.props.value.get());
            }
        } else { // Else, render modifiedFieldValue
            const numDigits = this.props.dataEntryFormat.maxDigits;
            if (this.modifiedFieldValue.get().length < numDigits || this.isFocused.get() === false) {
                this.textInputRef.getOrDefault().innerText = this.modifiedFieldValue.get();
                this.caretRef.getOrDefault().innerText = '';
            } else {
                this.textInputRef.getOrDefault().innerText = this.modifiedFieldValue.get().slice(0, numDigits - 1);
                this.caretRef.getOrDefault().innerText = this.modifiedFieldValue.get().slice(numDigits - 1, numDigits);
            }
        }
    }

    private onKeyDown(ev: KeyboardEvent) {
        if (ev.keyCode === KeyCode.KEY_BACK_SPACE) {
            if (this.modifiedFieldValue.get() === null) {
                this.modifiedFieldValue.set('0');
            } else if (this.modifiedFieldValue.get().length === 0) {
                // Do nothing
            } else {
                this.modifiedFieldValue.set(this.modifiedFieldValue.get().slice(0, -1));
            }
        }
    }

    private onKeyPress(ev: KeyboardEvent) {
        // Un-select the numbers
        this.textInputRef.getOrDefault().classList.remove('valueSelected');
        // ev.key is undefined, so we have to use the deprecated keyCode here
        const key = String.fromCharCode(ev.keyCode);

        if (ev.keyCode !== KeyCode.KEY_ENTER) {
            if (this.modifiedFieldValue.get() === null) {
                this.modifiedFieldValue.set('');
            }

            if (this.modifiedFieldValue.get()?.length < this.props.dataEntryFormat.maxDigits) {
                this.modifiedFieldValue.set(`${this.modifiedFieldValue.get()}${key}`);
                this.caretRef.getOrDefault().style.display = 'inline';
            }
        } else {
            // Enter was pressed
            this.caretRef.getOrDefault().style.display = 'none';
            this.textInputRef.getOrDefault().blur();
        }
    }

    private onFocus() {
        this.isFocused.set(true);
        this.textInputRef.getOrDefault().classList.add('valueSelected');
        if (this.props.isMandatory === true) {
            this.textInputRef.getOrDefault().classList.remove('mandatory');
        }
        this.modifiedFieldValue.set(null);
        this.spanningDivRef.getOrDefault().style.justifyContent = 'flex-start';
        this.updateDisplayElement();
    }

    private onBlur() {
        this.isFocused.set(false);
        this.textInputRef.getOrDefault().classList.remove('valueSelected');
        this.spanningDivRef.getOrDefault().style.justifyContent = 'center';
        this.caretRef.getOrDefault().style.display = 'none';
        this.updateDisplayElement();

        if (!this.modifiedFieldValue.get() && this.props.value.get()) {
            // Enter is pressed after no modification
            this.validateAndUpdate(this.props.value.get().toString());
        } else {
            this.validateAndUpdate(this.modifiedFieldValue.get());
        }
    }

    private populatePlaceholders() {
        const placeholder = this.props.dataEntryFormat.placeholder;
        if (this.props.isMandatory === true) {
            this.textInputRef.getOrDefault().innerHTML = placeholder.replace(/-/gi, emptyMandatoryCharacter(this.isFocused.get()));
        } else {
            this.textInputRef.getOrDefault().innerText = placeholder;
        }
    }

    private async validateAndUpdate(input: string) {
        this.isValidating.set(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.modifiedFieldValue.set(null);
        const newValue = await this.props.dataEntryFormat.parse(input);
        this.props.value.set(newValue);
        this.isValidating.set(false);
    }

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        // Aspect ratio for font: 2:3 WxH
        this.spanningDivRef.instance.style.minWidth = `${this.props.dataEntryFormat.maxDigits * 25.0 / 1.5}px`;
        // this.textInputRef.instance.style.width = `${this.props.displayFormat.maxDigits * 25.0 / 1.5}px`;

        // Hide caret
        this.caretRef.instance.style.display = 'none';
        this.caretRef.instance.innerText = '';

        this.props.value.sub(() => this.onNewValue(), true);
        this.modifiedFieldValue.sub(() => this.updateDisplayElement());
        this.isValidating.sub((val) => {
            if (val === true) {
                this.textInputRef.getOrDefault().classList.add('validating');
            } else {
                this.textInputRef.getOrDefault().classList.remove('validating');
            }
        });

        this.props.dataEntryFormat.unitLeading.sub((val: string) => {
            this.leadingUnitRef.getOrDefault().innerText = val;
        });

        this.props.dataEntryFormat.unitTrailing.sub((val: string) => {
            this.trailingUnitRef.getOrDefault().innerText = val;
        });

        this.textInputRef.instance.addEventListener('keypress', (ev) => this.onKeyPress(ev));
        this.textInputRef.instance.addEventListener('keydown', (ev) => this.onKeyDown(ev));
        this.textInputRef.instance.addEventListener('focus', () => this.onFocus());
        this.textInputRef.instance.addEventListener('blur', () => this.onBlur());

        this.topRef.instance.addEventListener('click', () => {
            this.textInputRef.instance.focus();
        });
    }

    render(): VNode {
        return (
            <div ref={this.topRef} class="MFDNumberInputContainer" style={this.props.containerStyle}>
                <span ref={this.leadingUnitRef} class="MFDUnitLabel leadingUnit" style="align-self: center;">{this.props.dataEntryFormat.unitLeading.get()}</span>
                <div ref={this.spanningDivRef} style="display: flex; flex-direction: row; justify-content: center;">
                    <span
                        ref={this.textInputRef}
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                        tabIndex={0}
                        class={`MFDNumberInputTextInput${this.props.isMandatory ? ' mandatory' : ''}`}
                    >
                        .
                    </span>
                    <span ref={this.caretRef} class="MFDInputFieldCaret" />
                </div>
                <span ref={this.trailingUnitRef} class="MFDUnitLabel trailingUnit" style="align-self: center;">{this.props.dataEntryFormat.unitTrailing.get()}</span>
            </div>
        );
    }
}
