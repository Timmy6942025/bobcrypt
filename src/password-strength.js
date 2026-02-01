let zxcvbn;

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined' && window.zxcvbn) {
  zxcvbn = window.zxcvbn;
} else {
  try {
    const zxcvbnModule = await import('./zxcvbn.js');
    zxcvbn = zxcvbnModule.default || zxcvbnModule;
  } catch (e) {
    zxcvbn = globalThis.zxcvbn;
  }
}

const SCORE_LABELS = {
  0: { label: 'Very Weak', class: 'weak' },
  1: { label: 'Weak', class: 'weak' },
  2: { label: 'Fair', class: 'fair' },
  3: { label: 'Good', class: 'good' },
  4: { label: 'Strong', class: 'strong' }
};

export function analyzePassword(password, userInputs = []) {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: 'Enter a password',
      className: '',
      crackTime: '',
      crackTimeSeconds: 0,
      suggestions: [],
      warning: '',
      isStrong: false
    };
  }

  const result = zxcvbn(password, userInputs);
  const scoreInfo = SCORE_LABELS[result.score];
  const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second;
  const crackTimeSeconds = result.crack_times_seconds.offline_slow_hashing_1e4_per_second;
  const suggestions = result.feedback.suggestions || [];
  const warning = result.feedback.warning || '';
  const isStrong = result.score >= 3;
  
  return {
    score: result.score,
    label: scoreInfo.label,
    className: scoreInfo.class,
    crackTime: crackTime ? `~${crackTime} to crack` : '',
    crackTimeSeconds,
    suggestions,
    warning,
    isStrong,
    raw: result
  };
}

export function getStrengthClass(score) {
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  if (score >= 4) return 'strong';
  return '';
}

export function isPasswordStrong(password, minScore = 3) {
  if (!password || password.length === 0) return false;
  const result = zxcvbn(password);
  return result.score >= minScore;
}

export function getPasswordSuggestions(password) {
  if (!password || password.length === 0) return [];
  const result = zxcvbn(password);
  return result.feedback.suggestions || [];
}

export function formatCrackTime(crackTime) {
  if (!crackTime) return '';
  return `~${crackTime} to crack`;
}

export function initStrengthMeter(inputElement, uiElements, onStrengthChange = null) {
  if (!inputElement || !uiElements) return;
  
  const {
    bar,
    label,
    crackTime,
    suggestions,
    barContainer
  } = uiElements;
  
  function updateStrength() {
    const password = inputElement.value;
    const analysis = analyzePassword(password);
    
    if (bar) {
      bar.className = 'strength-bar';
      if (password) {
        bar.classList.add(analysis.className);
      }
    }
    
    if (label) {
      label.className = 'strength-label';
      if (password) {
        label.classList.add(analysis.className);
      }
      label.textContent = analysis.label;
    }
    
    if (barContainer) {
      barContainer.setAttribute('aria-valuenow', analysis.score);
    }
    
    if (crackTime) {
      crackTime.textContent = analysis.crackTime;
    }
    
    if (suggestions) {
      const allSuggestions = [];
      
      if (analysis.warning) {
        allSuggestions.push(analysis.warning);
      }
      
      allSuggestions.push(...analysis.suggestions);
      
      const limitedSuggestions = allSuggestions.slice(0, 3);
      
      suggestions.textContent = '';
      limitedSuggestions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.setAttribute('role', 'listitem');
        div.textContent = s;
        suggestions.appendChild(div);
      });
    }
    
    if (onStrengthChange) {
      onStrengthChange(analysis);
    }
  }
  
  inputElement.addEventListener('input', updateStrength);
  updateStrength();
  
  return () => {
    inputElement.removeEventListener('input', updateStrength);
  };
}

export default {
  analyzePassword,
  getStrengthClass,
  isPasswordStrong,
  getPasswordSuggestions,
  formatCrackTime,
  initStrengthMeter
};
