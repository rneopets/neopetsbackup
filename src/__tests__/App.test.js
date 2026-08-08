import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../test-utils';
import App from '../App';

test('renders the about blurb', () => {
  render(<App />);
  const linkElement = screen.getByText(/howdy folks/i);
  expect(linkElement).toBeInTheDocument();
});
