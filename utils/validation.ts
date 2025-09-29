export const PHONE_REGEX =
  /^(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}$/;
export const NAME_REGEX = new RegExp("^[\\p{L}\\s'’\\-]{2,100}$", 'u');
export const ADDRESS_REGEX = new RegExp(
  "^[\\p{L}0-9\\s.,'’\\-()]{5,200}$",
  'u'
);
