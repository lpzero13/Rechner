'use strict';
// A minimal DOM/event fixture for executing the real browser scripts against the
// shipped HTML. This tests application wiring; it is not a browser/layout engine.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const attr = (text, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(text)?.[1];
const plainText = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();

function boot(options = {}) {
  const elements = new Map();
  function element(tag, attributes, content = '') {
    const listeners = new Map();
    const classes = new Set((attr(attributes, 'class') || '').split(/\s+/).filter(Boolean));
    const node = {
      tag, attributes: {}, value: attr(attributes, 'value') || '', textContent: plainText(content),
      hidden: /\bhidden\b/.test(attributes), dataset: {}, style: {},
      validity: { badInput: false, rangeOverflow: false, rangeUnderflow: false },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(callback);
      },
      fire(type, event = { preventDefault() {} }) {
        for (const callback of listeners.get(type) || []) callback(event);
        if (node.form) node.form.fire(type, event);
      },
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const add = force ?? !classes.has(name);
          if (add) classes.add(name); else classes.delete(name);
          return add;
        },
      },
    };
    if (tag === 'select') {
      const choices = [...content.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(match => ({ value: attr(match[1], 'value'), textContent: plainText(match[2]), selected: /\bselected\b/.test(match[1]) }));
      node.value = (choices.find(choice => choice.selected) || choices[0]).value;
      Object.defineProperty(node, 'selectedOptions', { get: () => choices.filter(choice => choice.value === node.value) });
    }
    node.defaultValue = node.value;
    return node;
  }
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const [, tag, attributes, id] = match;
    const begin = match.index + match[0].length;
    const end = html.indexOf(`</${tag}>`, begin);
    elements.set(id, element(tag, attributes, end >= begin ? html.slice(begin, end) : ''));
  }
  const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)];
  for (const formMatch of forms) {
    const form = elements.get(attr(formMatch[1], 'id'));
    const children = [...formMatch[2].matchAll(/<(?:input|select|button)\b([^>]*)>/g)].map(match => elements.get(attr(match[1], 'id'))).filter(Boolean);
    children.forEach(node => { node.form = form; });
    form.reset = () => children.forEach(node => {
      node.value = node.defaultValue;
      node.validity = { badInput: false, rangeOverflow: false, rangeUnderflow: false };
    });
  }
  const riskButtons = [...html.matchAll(/<button\b([^>]*\bdata-risk="[^"]+"[^>]*)>/g)].map(match => {
    const button = element('button', match[1]);
    button.dataset.risk = attr(match[1], 'data-risk');
    return button;
  });
  const windowEvents = new Map();
  const document = {
    documentElement: { dataset: {} },
    getElementById: id => elements.get(id) || null,
    querySelectorAll(selector) {
      if (selector === '[data-risk]') return riskButtons;
      throw new Error('Unsupported fixture selector: ' + selector);
    },
  };
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener(type, callback) {
      if (!windowEvents.has(type)) windowEvents.set(type, []);
      windowEvents.get(type).push(callback);
    },
    fire(type) { for (const callback of windowEvents.get(type) || []) callback(); },
  };
  const context = vm.createContext({ document, window, console });
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  for (const script of scripts) {
    if (options.omit === script) continue;
    const source = script === 'src/main.js' && options.mainSource !== undefined ? options.mainSource : readFileSync(resolve(root, script), 'utf8');
    vm.runInContext(source, context, { filename: script, timeout: 1000 });
  }
  return {
    elements, window,
    input(id, value, type = 'input') {
      const node = elements.get(id);
      node.value = value;
      node.fire(type);
    },
    text: id => elements.get(id).textContent,
  };
}

module.exports = { boot, html, root };
