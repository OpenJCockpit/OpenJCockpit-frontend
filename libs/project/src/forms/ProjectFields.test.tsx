import { createRef } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRequest } from '@openjcockpit/api';
import { render } from '../testRender';
import { GeneralFields, RepositoryFields } from './ProjectFields';

const EMPTY = { name: '' } as ProjectRequest;

/** Applies the updater passed to onChange to a form, as the parent would. */
function applied(onChange: ReturnType<typeof vi.fn>, from: ProjectRequest = EMPTY) {
  const updater = onChange.mock.calls.at(-1)![0] as (f: ProjectRequest) => ProjectRequest;
  return updater(from);
}

describe('GeneralFields', () => {
  function setup(props: { nameInvalid?: boolean; nameError?: string | null } = {}) {
    const onChange = vi.fn();
    render(
      <GeneralFields
        form={EMPTY}
        onChange={onChange}
        nameInvalid={props.nameInvalid ?? false}
        nameError={props.nameError}
        nameInputRef={createRef<HTMLInputElement>()}
      />,
    );
    return onChange;
  }

  it('renders empty optional fields and reports each edit', () => {
    const onChange = setup();
    const edits: [RegExp, keyof ProjectRequest][] = [
      [/^Name/, 'name'],
      [/Customer/, 'customerId'],
      [/Environment/, 'environment'],
      [/Owner/, 'owner'],
      [/Description/, 'description'],
    ];
    for (const [label, key] of edits) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: 'x' } });
      expect(applied(onChange)[key]).toBe('x');
    }
  });

  it('links the name input to the shared error id when invalid without a message', () => {
    setup({ nameInvalid: true });
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute(
      'aria-describedby',
      'project-name-error',
    );
  });

  it('shows the inline name error', () => {
    setup({ nameInvalid: true, nameError: 'Name is required.' });
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});

describe('RepositoryFields', () => {
  it('renders empty values and reports each edit', () => {
    const onChange = vi.fn();
    render(<RepositoryFields form={EMPTY} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/Git URL/), { target: { value: 'u' } });
    expect(applied(onChange).gitUrl).toBe('u');
    fireEvent.change(screen.getByLabelText(/^Branch/), { target: { value: 'b' } });
    expect(applied(onChange).defaultBranch).toBe('b');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(applied(onChange).newProject).toBe(1);
  });

  it('turns the new-project flag off again', () => {
    const onChange = vi.fn();
    render(<RepositoryFields form={{ ...EMPTY, newProject: 1 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(applied(onChange).newProject).toBe(0);
  });
});
