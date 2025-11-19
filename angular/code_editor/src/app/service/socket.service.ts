import { io, Socket } from "socket.io-client";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class SocketService {
  socket!: Socket;

  constructor() {
    this.socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
  }
}
