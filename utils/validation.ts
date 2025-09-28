export const PHONE_REGEX = /^\+?[0-9()\s-]{7,20}$/;
export const NAME_REGEX = new RegExp("^[\\p{L}\\s'’\\-]{2,100}$", 'u');
export const ADDRESS_REGEX = new RegExp(
  "^[\\p{L}0-9\\s.,'’\\-()]{5,200}$",
  'u'
);
