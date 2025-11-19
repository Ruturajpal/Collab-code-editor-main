import { Component, ElementRef } from '@angular/core';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';
import { Ai } from '../../service/ai'
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-editor',
  imports: [FormsModule],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {
// Stores the ID for the collaborative editing room, retrieved from route parameters.
  roomId = '';
 
  // Holds the instance of the CodeMirror EditorView, which renders the editor.
  private view!: EditorView;
 
  // This constructor injects necessary Angular services for routing, AI completion,
  // and accessing the component's host element in the DOM.
  constructor(
    private route: ActivatedRoute,
    private ai: Ai,
    private el: ElementRef
  ) { }
 
  // This lifecycle hook is called after the component's view has been initialized.
  // It contains the core logic for setting up Yjs synchronization and the CodeMirror editor.
  ngAfterViewInit(): void {
    // Get the room ID from the route's query parameters, defaulting to 'default'.
    this.roomId = this.route.snapshot.queryParamMap.get('room') ?? 'default';
 
    // --- YJS Initialization ---
    // Create a new Yjs document to hold the shared state.
    const yDoc = new Y.Doc();
 
    // Create a WebsocketProvider to connect the Yjs document to the collaborative server.
    // This handles the real-time synchronization of changes between clients.
    const provider = new WebsocketProvider(
      'ws://localhost:1234',// Backend Web socket
      this.roomId,
      yDoc
    );
 
    // Get a shared text type from the Yjs document which CodeMirror will bind to.
    const yText = yDoc.getText('codemirror');
 
 
    // --- AI Completion Setup ---
    // Configure the CodeMirror autocompletion extension using the custom AI service.
    // The override function asynchronously fetches suggestions based on the current code and cursor position.
    const aiCompletion = autocompletion({
      override: [
        async (context) => {
          const doc = context.state.doc.toString();
          const offset = context.pos;
          // Call the AI service to get a code completion suggestion from the backend.
          const response: any = await this.ai.getCompletion(doc, offset).toPromise();
          const text = response.completion || " ";
          // Format the AI response into a suggestion object for CodeMirror.
          const suggestions = [{
            label: text.substring(0, 100),
            text: text,
          }]
          // Return the CodeMirror CompletionResult object, applying the AI text from the current position.
          return {
            from: context.pos,
            options: suggestions.map((s: any) => ({
              label: s.label,
              type: 'keyword',
              apply: s.text
            }))
          };
        }
      ]
    });
 
 
    // --- CodeMirror Editor Setup ---
    // Initialize the CodeMirror EditorView with the desired state and extensions.
    // It binds the view to the 'editor' element in the component's template.
    this.view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          javascript(),
          yCollab(yText, provider.awareness),
          aiCompletion
        ] as Extension[]
      }),
      parent: this.el.nativeElement.querySelector('#editor')
    })
  }
 
 
}
