import { Socket, io } from "socket.io-client";

const socket: Socket = io(process.env.REACT_APP_API_URL || "http://localhost:3333", {
  autoConnect: true,
});

export default socket;
