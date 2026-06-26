import { Client, Room } from "colyseus.js";
import { DEFAULT_CLASS } from "@aetherfall/shared";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:2567`;

export async function connect(name: string, charClass = DEFAULT_CLASS): Promise<Room> {
  const client = new Client(SERVER_URL);
  return client.joinOrCreate("combat", { name, charClass });
}
