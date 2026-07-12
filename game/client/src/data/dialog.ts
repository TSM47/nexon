/**
 * Drzewo dialogowe Eldrica Ashforda (klient — sama prezentacja).
 * Każdy węzeł ma tekst i listę wyborów; wybór prowadzi do kolejnego
 * węzła (`next`) albo wykonuje akcję (`action`).
 */
export type DialogAction = "shop" | "close" | "quests";

export interface DialogChoice {
  label: string;
  next?: string;
  action?: DialogAction;
}

export interface DialogNode {
  text: string;
  choices: DialogChoice[];
}

export const ELDRIC_DIALOG: Record<string, DialogNode> = {
  start: {
    text: "Witaj w „Zbłąkanym Aetherze”, wędrowcze. Rzadki to widok — ktoś żywy w tych stronach. Siadaj przy ogniu... albo mów, czego szukasz.",
    choices: [
      { label: "Kim jesteś?", next: "about" },
      { label: "Co wiesz o Strażniku Aetheru?", next: "guardian" },
      { label: "Pokaż swój towar.", action: "shop" },
      { label: "Masz dla mnie jakieś zajęcie?", next: "quest" },
      { label: "Żegnaj.", action: "close" },
    ],
  },
  about: {
    text: "Eldric Ashford, do usług. Trzymam tę karczmę od trzydziestu lat — odkąd te ziemie jeszcze tętniły życiem. Dziś zaglądają tu głównie tacy śmiałkowie jak ty. I duchy.",
    choices: [
      { label: "Duchy?", next: "ghosts" },
      { label: "Wróćmy do rozmowy.", next: "start" },
    ],
  },
  ghosts: {
    text: "Aether wypaczył wszystko, co go dotknęło. Nocami słychać szept run z kręgu. Ja tam nie chodzę. Ty rób, jak uważasz — ale nie mów, że nie ostrzegałem.",
    choices: [{ label: "Wróćmy do rozmowy.", next: "start" }],
  },
  guardian: {
    text: "Strażnik? Zakuty w karmazynową zbroję kolos, co pilnuje kręgu od wieków. Gdy ziemia rozbłyska czerwienią — schodź z niej albo giń. Unik to twój przyjaciel, pamiętaj.",
    choices: [
      { label: "Jak go pokonać?", next: "guardian2" },
      { label: "Wróćmy do rozmowy.", next: "start" },
    ],
  },
  guardian2: {
    text: "Cierpliwością. Trzymaj dystans, kłuj z daleka, nie chciwość na ciosy. Wielu poległo, bo chcieli za szybko. Wróć z łupami — pohandlujemy.",
    choices: [
      { label: "Pokaż towar.", action: "shop" },
      { label: "Wróćmy do rozmowy.", next: "start" },
    ],
  },
  quest: {
    text: "Zajęcie? Zawsze się jakieś znajdzie. Zajrzyj do swojego dziennika — spisałem ci tam parę rzeczy, które warto zrobić w okolicy.",
    choices: [
      { label: "Otwórz dziennik zadań.", action: "quests" },
      { label: "Wróćmy do rozmowy.", next: "start" },
    ],
  },
};

export const DIALOG_START = "start";
