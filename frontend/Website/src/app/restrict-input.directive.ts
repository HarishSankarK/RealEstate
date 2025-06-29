import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appRestrictInput]',
  standalone: true
})
export class RestrictInputDirective {
  @Input('appRestrictInput') inputType: string = '';

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event']) onInput(event: Event): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let value = input.value;

    switch (this.inputType) {
      case 'numbers':
        // Allow only digits
        value = value.replace(/[^0-9]/g, '');
        break;
      case 'letters':
        // Allow only letters and spaces
        value = value.replace(/[^a-zA-Z\s]/g, '');
        break;
      case 'cardNumber':
        // Allow digits and format as XXXX XXXX XXXX XXXX
        value = value.replace(/[^0-9]/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        value = value.slice(0, 19); // Max length: 19 (16 digits + 3 spaces)
        break;
      case 'expiryDate':
        // Allow MM/YY format
        value = value.replace(/[^0-9\/]/g, '');
        if (value.length > 2 && value.charAt(2) !== '/') {
          value = value.slice(0, 2) + '/' + value.slice(2);
        }
        value = value.slice(0, 5); // Max length: 5 (MM/YY)
        break;
      default:
        break;
    }

    input.value = value;
  }
}