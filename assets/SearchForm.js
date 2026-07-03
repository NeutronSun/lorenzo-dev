import { HTMLComponent } from '@theme/HTMLComponent';

class SearchQuery {
  static TERM_SEPARATOR = /\s+/;

  /** @param {string} query */
  static toPrefix(query) {
    const parts = [];

    for (const term of query.split(SearchQuery.TERM_SEPARATOR)) {
      const normalizedTerm = term.trim();

      if (!normalizedTerm) continue;

      parts.push(normalizedTerm.endsWith('*') ? normalizedTerm : `${normalizedTerm}*`);
    }

    return parts.join(' ');
  }
}

/**
 * @typedef {Object} SearchFormRefs
 * @property {HTMLInputElement} query
 */

/** @extends {HTMLComponent<SearchFormRefs>} */
class SearchForm extends HTMLComponent {
  /** @param {SubmitEvent} event */
  handleSubmit(event) {
    if (!this.refs.query) return;

    this.refs.query.value = SearchQuery.toPrefix(this.refs.query.value);
  }
}

if (!customElements.get('search-form')) {
  customElements.define('search-form', SearchForm);
}
