import { Component } from '@angular/core';
import { PdfConverterComponent } from './components/pdf-converter/pdf-converter.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PdfConverterComponent],
  template: `
    <div class="app-container">
      <app-pdf-converter />
    </div>
  `,
  styles: [`
    .app-container {
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
  `]
})
export class AppComponent {}
