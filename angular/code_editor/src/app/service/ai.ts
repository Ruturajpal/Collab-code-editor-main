import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private readonly apiUrl = "/api/complete-code"
  // The constructor injects the HttpClient module, which is used to make API calls.
  constructor(private http: HttpClient) { }
  // This method sends the current code and cursor position to the backend for AI code completion.
  // It returns an Observable of the HTTP POST request response.
  getCompletion(code: string, cursor: number) {
    return this.http.post<any>(this.apiUrl, { code, cursorOffset: cursor })
  }
}
