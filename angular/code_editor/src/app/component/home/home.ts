
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
 
  //  Stores the Room ID entered by the user via the input field. 

  //  Holds the state data required for room joining logic.

  roomId = "";
 
  // Initializes the component and injects the Angular Router service. 

  // This grants the component the ability to navigate between application views.

  constructor(private router: Router) { }
 
  // Validates the room ID, ensuring the input isn't empty or just whitespace.

  // Stops the function immediately if the input is invalid to prevent errors.

  // Navigates the user to the /editor route.

  // Passes the entered roomId as a query parameter for the destination component.

  joinRoom() {

    if (!this.roomId.trim()) return;

    this.router.navigate(['/editor'], { queryParams: { room: this.roomId } })

  }

}

 
