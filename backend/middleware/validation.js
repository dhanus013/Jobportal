const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_POSITIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Analyst',
  'Data Scientist',
  'Product Manager',
  'UI/UX Designer',
  'QA Engineer',
];

/**
 * Validates the application form fields. Returns an array of human-readable
 * error messages — empty array means validation passed.
 */
function validateApplicationInput({ fullName, email, position }) {
  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters.');
  }
  if (fullName && fullName.trim().length > 100) {
    errors.push('Full name must be under 100 characters.');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!position || typeof position !== 'string' || position.trim().length === 0) {
    errors.push('Position is required.');
  } else if (!ALLOWED_POSITIONS.includes(position.trim())) {
    errors.push(`Position must be one of: ${ALLOWED_POSITIONS.join(', ')}.`);
  }

  return errors;
}

module.exports = { validateApplicationInput, ALLOWED_POSITIONS, EMAIL_REGEX };
