import { v4 as uuidv4 } from 'uuid';

export const generateShortId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateRequestId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `HR-${datePart}-${randomPart}`;
};
