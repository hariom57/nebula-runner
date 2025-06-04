// import DOMPurify from 'dompurify';

// Input Sanitization
export function sanitizeInput(input) {
  return input.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
}

//Advanced, and more rubust:
// export function sanitizeInput(input) {
//   return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }); // Strip all HTML
// }



// Score Validation
export function isValidScore(score) {
  return typeof score === 'number' && 
         score > 0 && 
         score < 1000000 &&
         !isNaN(score);
}
