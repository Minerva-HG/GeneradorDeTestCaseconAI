import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfConverterService } from '../../services/pdf-converter.service';

@Component({
  selector: 'app-pdf-converter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-converter.component.html',
  styleUrls: ['./pdf-converter.component.css']
})
export class PdfConverterComponent {
  archivoSeleccionado: File | null = null;
  estado: 'idle' | 'convirtiendo' | 'exito' | 'error' = 'idle';
  mensajeError = '';
  arrastrando = false;

  constructor(private pdfService: PdfConverterService) {}

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.seleccionarArchivo(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.seleccionarArchivo(event.dataTransfer.files[0]);
    }
  }

  private seleccionarArchivo(file: File): void {
    if (file.type !== 'application/pdf') {
      this.estado = 'error';
      this.mensajeError = 'Solo se permiten archivos PDF.';
      this.archivoSeleccionado = null;
      return;
    }
    this.archivoSeleccionado = file;
    this.estado = 'idle';
    this.mensajeError = '';
  }

  convertir(): void {
    if (!this.archivoSeleccionado) return;

    this.estado = 'convirtiendo';
    this.mensajeError = '';

    this.pdfService.convertirPdfADocx(this.archivoSeleccionado).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob);
        this.estado = 'exito';
      },
      error: (err: Error) => {
        this.estado = 'error';
        this.mensajeError = err.message;
      }
    });
  }

  private descargarArchivo(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.archivoSeleccionado!.name.replace(/\.pdf$/i, '.docx');
    a.click();
    window.URL.revokeObjectURL(url);
  }

  reiniciar(): void {
    this.archivoSeleccionado = null;
    this.estado = 'idle';
    this.mensajeError = '';
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
