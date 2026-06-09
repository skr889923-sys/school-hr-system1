import { v4 as uuidv4 } from 'uuid';

export const generateShortId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateRequestId = () => {
  return `HR-${generateShortId()}`;
};
