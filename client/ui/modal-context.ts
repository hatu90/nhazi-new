import { createContext } from "react";

export const ModalContext = createContext<{ title: string; onClose: () => void } | null>(null);
