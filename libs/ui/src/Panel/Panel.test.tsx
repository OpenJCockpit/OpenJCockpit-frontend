import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ActionRow,
  ListRow,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  TwoColumn,
  panelClassName,
} from './Panel';

describe('Panel parts', () => {
  it('renders every part with its own class and merges className', () => {
    render(
      <TwoColumn className="two" data-testid="two">
        <Panel as="article" className="p" data-testid="panel">
          <PanelHeader simple className="h" data-testid="header">
            <PanelTitle>Title</PanelTitle>
          </PanelHeader>
          <PanelBody as="section" className="b" data-testid="body">
            <ListRow className="l" data-testid="row">
              Row
            </ListRow>
            <ActionRow className="a" data-testid="actions">
              Actions
            </ActionRow>
          </PanelBody>
        </Panel>
      </TwoColumn>,
    );
    expect(screen.getByTestId('panel').tagName).toBe('ARTICLE');
    expect(screen.getByTestId('panel')).toHaveClass('p');
    expect(panelClassName).toBeTruthy();
    expect(screen.getByTestId('header')).toHaveClass('h');
    expect(screen.getByTestId('body').tagName).toBe('SECTION');
    for (const id of ['two', 'row', 'actions']) expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});
