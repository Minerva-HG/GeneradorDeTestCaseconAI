import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PdfConverterService {

  private readonly apiUrl = 'http://localhost:3000/api/pdf-to-docx';

  constructor(private http: HttpClient) {}

  convertirPdfADocx(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(this.apiUrl, formData, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error desconocido al convertir el archivo';

    if (error.status === 0) {
      mensaje = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
    } else if (error.status === 400) {
      mensaje = 'Archivo inválido. Solo se permiten archivos PDF.';
    } else if (error.status === 413) {
      mensaje = 'El archivo es demasiado grande (máximo 50 MB).';
    } else if (error.status === 500) {
      mensaje = 'Error en el servidor al convertir el PDF.';
    }

    return throwError(() => new Error(mensaje));
  }
}
