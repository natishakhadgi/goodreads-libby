function isbn10To13(isbn10) {
  const digits = isbn10.replace(/[-\s]/g, '').toUpperCase();

  if (!/^\d{9}[\dX]$/.test(digits)) {
    throw new Error('Invalid ISBN-10');
  }

  // ISBN-10 can only be converted to ISBN-13 when the
  // corresponding ISBN-13 uses the 978 prefix.
  // ISBN-13s beginning with 979 do not have an ISBN-10 equivalent.
  const base = '978' + digits.slice(0, 9);

  const sum = [...base].reduce(
    (sum, digit, i) =>
      sum + Number(digit) * (i % 2 === 0 ? 1 : 3),
    0
  );

  const checkDigit = (10 - (sum % 10)) % 10;

  return base + checkDigit;
};

export default isbn10To13;
