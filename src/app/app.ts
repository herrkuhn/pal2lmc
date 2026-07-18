import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ConverterPageComponent } from './features/converter/converter-page.component';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, ConverterPageComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
// Renders a static template with no dynamic bindings, so the default
// change-detection strategy never has anything to go stale on.
export class App {}
