import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { NewOrder } from './NewOrder';

// Polyfill pointer-events mostly used by Radix UI (shadcn Select components)
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function() {};
  window.HTMLElement.prototype.hasPointerCapture = function() { return false; };
  window.HTMLElement.prototype.releasePointerCapture = function() {};
  window.PointerEvent = class PointerEvent extends Event {} as any;
});

beforeEach(() => {
  localStorage.clear();
});

describe('NewOrder Line Item Cascade', () => {
  it('should explicitly disable downstream until upstream is selected and display proper placeholders', async () => {
    render(<MemoryRouter><NewOrder /></MemoryRouter>);

    const brandTrigger = screen.getByRole('combobox', { name: 'Brand' });
    expect(brandTrigger).toBeEnabled();

    const categoryTrigger = screen.getByRole('combobox', { name: 'Category' });
    expect(categoryTrigger).toBeDisabled();
    expect(categoryTrigger).toHaveTextContent('Select brand first');

    const feedTypeTrigger = screen.getByRole('combobox', { name: 'Feed Type' });
    expect(feedTypeTrigger).toBeDisabled();
    expect(feedTypeTrigger).toHaveTextContent('Select category first');

    const productTrigger = screen.getByRole('combobox', { name: 'Product' });
    expect(productTrigger).toBeDisabled();
    expect(productTrigger).toHaveTextContent('Select feed type first');

    const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
    expect(packagingTrigger).toBeDisabled();
    expect(packagingTrigger).toHaveTextContent('Select product first');
  });

  it('should clear downstream values when an upstream value is changed', async () => {
    render(<MemoryRouter><NewOrder /></MemoryRouter>);
    const user = userEvent.setup();

    // 1. Select Brand
    const brandTrigger = screen.getByRole('combobox', { name: 'Brand' });
    await user.click(brandTrigger);
    let listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Neelam Supreme'));

    // 2. Select Category
    const categoryTrigger = screen.getByRole('combobox', { name: 'Category' });
    expect(categoryTrigger).toBeEnabled();
    expect(categoryTrigger).toHaveTextContent('Select category');
    await user.click(categoryTrigger);
    listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Cattle'));

    // Feed Type might auto-select if there's only one. Check text content.
    const feedTypeTrigger = screen.getByRole('combobox', { name: 'Feed Type' });
    await waitFor(() => expect(feedTypeTrigger).toBeEnabled());
    // Neelam Supreme -> Cattle -> Dairy Concentrate / Calf Starter
    if (feedTypeTrigger.textContent?.includes('Select feed type')) {
      await user.click(feedTypeTrigger);
      listbox = await screen.findByRole('listbox');
      await user.click(within(listbox).getByText('Dairy Concentrate'));
    }

    // 3. Select Product
    const productTrigger = screen.getByRole('combobox', { name: 'Product' });
    await waitFor(() => expect(productTrigger).toBeEnabled());
    // Auto-selection might have happened. Check if we need to manually select.
    if (productTrigger.textContent?.includes('Select product')) {
      await user.click(productTrigger);
      listbox = await screen.findByRole('listbox');
      const productOptions = within(listbox).getAllByRole('option');
      await user.click(productOptions[0]);
    }

    // Check Packaging. It auto-selects if one, or we select 50kg.
    const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
    await waitFor(() => expect(packagingTrigger).toBeEnabled());
    if (packagingTrigger.textContent?.includes('Select packaging')) {
      await user.click(packagingTrigger);
      listbox = await screen.findByRole('listbox');
      const packagingOptions = within(listbox).getAllByRole('option');
      await user.click(packagingOptions[0]);
    }

    // Everything is selected now, packaging should NOT be throwing "product first"
    expect(packagingTrigger).not.toHaveTextContent('Select product first');

    // 4. Now CHANGE Brand to something else
    await user.click(brandTrigger);
    listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Standard Choice'));

    // Verify downstream state. 
    // Since "Standard Choice" only has 1 product, it cascades all the way down and auto-selects product!
    // And packaging will auto-select `50kg Bag` thanks to the useEffect!
    expect(packagingTrigger).toBeEnabled();
    await waitFor(() => expect(packagingTrigger).toHaveTextContent('50kg Bag'));
  });

  it('should clear Quantity when Packaging or Product is changed', async () => {
    // Similar to above, verify that setting size to something resets qty
    render(<MemoryRouter><NewOrder /></MemoryRouter>);
    const user = userEvent.setup();

    // Use Quick Add to populate fully
    const quickAddButton = screen.getAllByRole('button', { name: /Neelam Dairy Max/i })[0];
    await user.click(quickAddButton);

    // Enter quantity
    const quantityInput = screen.getByLabelText(/Qty \(Bags\)/i);
    await user.type(quantityInput, '10');
    expect(quantityInput).toHaveValue('10');

    // Change Packaging
    const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
    await user.click(packagingTrigger);
    const listbox = await screen.findByRole('listbox');
    const anotherPkg = within(listbox).queryByText(/25/i);
    // if anotherPkg exists, click it, else just click the same to test
    if (anotherPkg) {
       await user.click(anotherPkg);
    } else {
       const opts = within(listbox).getAllByRole('option');
       await user.click(opts[0]);
    }

    // Qty should be visually cleared
    expect(quantityInput).toHaveValue('');
  });

  it('should resolve to the same line-item state whether from Search, Quick Add, or Manual Cascade', async () => {
    // We want to test picking "Neelam Dairy Max 1000" in 50kg bags.
    // 1. Manually
    const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: 'Brand' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Neelam Supreme'));

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Cattle'));

    const feedTypeTrigger = screen.getByRole('combobox', { name: 'Feed Type' });
    await waitFor(() => expect(feedTypeTrigger).toBeEnabled());
    if (feedTypeTrigger.textContent?.includes('Select feed type')) {
      await user.click(feedTypeTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('Dairy Concentrate'));
    }

    const productTrigger = screen.getByRole('combobox', { name: 'Product' });
    await waitFor(() => expect(productTrigger).toBeEnabled());
    if (productTrigger.textContent?.includes('Select product')) {
      await user.click(productTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('Neelam Dairy Max 1000'));
    }

    const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
    await waitFor(() => expect(packagingTrigger).toBeEnabled());
    if (packagingTrigger.textContent?.includes('Select packaging')) {
      await user.click(packagingTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));
    }

    expect(feedTypeTrigger.textContent).toContain('Dairy Concentrate');
    expect(productTrigger.textContent).toContain('Neelam Dairy Max 1000');
    expect(packagingTrigger.textContent).toContain('50kg Bag');

    // 2. Clear state by setting Brand to something that doesn't auto-cascade
    await user.click(screen.getByRole('combobox', { name: 'Brand' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Standard Choice'));
    await user.click(screen.getByRole('combobox', { name: 'Brand' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Neelam Supreme'));

    expect(productTrigger).toBeDisabled();

    // 3. Search
    const searchInput = screen.getByLabelText(/Search for a product/i);
    await user.type(searchInput, 'Max');
    const searchListbox = await screen.findByRole('listbox');
    
    // Highlight breaks text down into multiple elements, so we look for the option role
    const searchOptions = within(searchListbox).getAllByRole('option');
    const searchOption = searchOptions.find(opt => opt.textContent?.includes('Neelam Dairy Max 1000'));
    if (!searchOption) throw new Error('Could not find search option');
    
    await user.click(searchOption);

    await waitFor(() => expect(productTrigger).toBeEnabled());
    expect(feedTypeTrigger.textContent).toContain('Dairy Concentrate');
    expect(productTrigger.textContent).toContain('Neelam Dairy Max 1000');

    await waitFor(() => expect(packagingTrigger).toBeEnabled());
    if (packagingTrigger.textContent?.includes('Select packaging')) {
      await user.click(packagingTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));
    }

    expect(packagingTrigger.textContent).toContain('50kg Bag');

    // Also assert that search input is cleared
    expect(searchInput).toHaveValue('');

    // 4. Clear by changing brand to Neelam Supreme
    await user.click(screen.getByRole('combobox', { name: 'Brand' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Standard Choice'));
    await user.click(screen.getByRole('combobox', { name: 'Brand' }));
    await user.click(within(await screen.findByRole('listbox')).getByText('Neelam Supreme'));

    // 5. Quick Add
    const quickAddButton = screen.getByRole('button', { name: /Quickly populate Neelam Dairy Max/i });
    await user.click(quickAddButton);

    await waitFor(() => expect(productTrigger).toBeEnabled());
    expect(feedTypeTrigger.textContent).toContain('Dairy Concentrate');
    expect(productTrigger.textContent).toContain('Neelam Dairy Max 1000');

    await waitFor(() => expect(packagingTrigger).toBeEnabled());
    if (packagingTrigger.textContent?.includes('Select packaging')) {
      await user.click(packagingTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));
    }

    expect(packagingTrigger.textContent).toContain('50kg Bag');

  });

  it('should clear search input when cascade is changed', async () => {
    render(<MemoryRouter><NewOrder /></MemoryRouter>);
    const user = userEvent.setup();

    const searchInput = screen.getByLabelText(/Search for a product/i);
    await user.type(searchInput, 'something');
    expect(searchInput).toHaveValue('something');

    // Change cascade
    const brandTrigger = screen.getByRole('combobox', { name: 'Brand' });
    await user.click(brandTrigger);
    let listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Neelam Supreme'));

    // Search input should be cleared
    await waitFor(() => expect(searchInput).toHaveValue(''));
  });

  describe('Party and Location Logistics', () => {
    it('auto-selects location when party has exactly one location', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      
      const partyInput = screen.getByLabelText(/Party Name/i);
      const locationInput = screen.getByLabelText(/Location/i);
      
      await user.type(partyInput, 'Sharma Dairy Farms{Enter}');
      // "Sharma Dairy Farms" has only one location "Moga"
      await waitFor(() => {
        expect(locationInput).toHaveValue('Moga');
      });
      
      unmount();
    });

    it('shows only valid locations for a selected party', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      
      const partyInput = screen.getByLabelText(/Party Name/i);
      const locationInput = screen.getByLabelText(/Location/i);
      
      await user.type(partyInput, 'Ravi Enterprises{Enter}');
      
      await user.click(locationInput);
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      
      // "Ravi Enterprises" has Ludhiana and Jalandhar (and possibly create option)
      const optionsText = options.map(o => o.textContent);
      expect(optionsText).toContain('Ludhiana');
      expect(optionsText).toContain('Jalandhar');
      expect(optionsText).not.toContain('Moga');
      
      unmount();
    });

    it('clears an incompatible location when party changes', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      
      const partyInput = screen.getByLabelText(/Party Name/i);
      const locationInput = screen.getByLabelText(/Location/i);
      
      await user.type(partyInput, 'Ravi Enterprises{Enter}');
      await user.type(locationInput, 'Ludhiana{Enter}');
      expect(locationInput).toHaveValue('Ludhiana');
      
      // Change to Sharma Dairy Farms (which requires Moga)
      await user.clear(partyInput);
      await user.type(partyInput, 'Sharma Dairy Farms{Enter}');
      
      await waitFor(() => {
        // Since it auto-selects, it should become Moga instead of just clearing!
        expect(locationInput).toHaveValue('Moga');
      });
      
      unmount();
    });

    it('creates new party and allows typing new locations', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      
      const partyInput = screen.getByLabelText(/Party Name/i);
      const locationInput = screen.getByLabelText(/Location/i);
      
      await user.type(partyInput, 'Acme Corp');
      await user.keyboard('{ArrowDown}{Enter}'); // Select Create option
      
      expect(partyInput).toHaveValue('Acme Corp');
      
      await user.type(locationInput, 'New York');
      await user.keyboard('{ArrowDown}{Enter}'); // Select Create option
      
      expect(locationInput).toHaveValue('New York');
      
      unmount();
    });
  });

  describe('Combobox ARIA pattern', () => {
    it('implements combobox attributes on Party Name and Location', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      const partyInput = screen.getByLabelText(/Party Name/i);
      expect(partyInput).toHaveAttribute('role', 'combobox');
      expect(partyInput).toHaveAttribute('aria-autocomplete', 'list');
      
      // Check initial state
      expect(partyInput).toHaveAttribute('aria-expanded', 'false');
      
      // Check keyboard interactions
      await user.click(partyInput);
      
      await waitFor(() => expect(partyInput).toHaveAttribute('aria-expanded', 'true'));
      
      const listboxId = partyInput.getAttribute('aria-controls');
      expect(listboxId).toBeTruthy();
      
      const listbox = document.getElementById(listboxId!);
      expect(listbox).toBeInTheDocument();

      await user.keyboard('{ArrowDown}');
      const comboActive = partyInput.getAttribute('aria-activedescendant');
      expect(comboActive).toBeTruthy();
      
      unmount();
    });

    it('implements combobox attributes on Product Search', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();
      const searchInput = screen.getByLabelText(/Search for a product/i);
      
      expect(searchInput).toHaveAttribute('role', 'combobox');
      expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
      expect(searchInput).toHaveAttribute('aria-expanded', 'false');

      await user.type(searchInput, 'Max');
      await waitFor(() => expect(searchInput).toHaveAttribute('aria-expanded', 'true'));
      
      await user.keyboard('{ArrowDown}');
      expect(searchInput.getAttribute('aria-activedescendant')).toBeTruthy();

      unmount();
    });
  });

  describe('Duplicate Cart Lines Logic', () => {
    it('merges quantities when the exact same product and packaging are added', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();

      // Add a line item via Quick Add (Neelam Dairy Max, 50kg)
      const quickAddButton = screen.getByRole('button', { name: /Quickly populate Neelam Dairy/i });
      await user.click(quickAddButton);

      // Verify cascading selects are populated
      const productTrigger = screen.getByRole('combobox', { name: 'Product' });
      await waitFor(() => expect(productTrigger).toBeEnabled());
      
      const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
      await user.click(packagingTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));

      const quantityInput = screen.getByLabelText(/Qty \(Bags\)/i);
      await waitFor(() => expect(quantityInput).not.toBeDisabled());
      await user.type(quantityInput, '10');
      await user.click(screen.getByRole('button', { name: 'Add Item' }));

      // Wait for item to appear in cart
      await waitFor(() => expect(screen.getAllByText('10').length).toBeGreaterThan(0));

      // Ensure form resets
      expect(quantityInput).toHaveValue('');

      // Add the exact same item again via Quick Add
      await user.click(quickAddButton);
      await waitFor(() => expect(productTrigger).toBeEnabled());
      
      await user.click(packagingTrigger);
      await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));
      
      await waitFor(() => expect(quantityInput).not.toBeDisabled());
      await user.type(quantityInput, '5');
      await user.click(screen.getByRole('button', { name: 'Add Item' }));

      // There should only be one item row with quantity 15
      await waitFor(() => expect(screen.getAllByText('15').length).toBeGreaterThan(0));
      // the initial '10' should be gone or replaced by '15'
      expect(screen.queryByText('10', { selector: 'div.font-semibold.text-sm' })).not.toBeInTheDocument();
      
      unmount();
    });

    it('keeps them separate if packaging is different', async () => {
       const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
       const user = userEvent.setup();

       // We need an item with multiple packaging. p3 'Neelam Calf Boost' has 25kg and 50kg.
       const quickAddButton = screen.getByRole('button', { name: /Quickly populate Neelam Calf Boost/i });
       await user.click(quickAddButton);

       const productTrigger = screen.getByRole('combobox', { name: 'Product' });
       await waitFor(() => expect(productTrigger).toBeEnabled());
       
       const packagingTrigger = screen.getByRole('combobox', { name: 'Packaging' });
       await user.click(packagingTrigger);
       await user.click(within(await screen.findByRole('listbox')).getByText('50kg Bag'));

       const quantityInput = screen.getByLabelText(/Qty \(Bags\)/i);
       await waitFor(() => expect(quantityInput).not.toBeDisabled());
       await user.type(quantityInput, '2');
       await user.click(screen.getByRole('button', { name: 'Add Item' }));

       await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThan(0));

       // Now add the same product but 25kg
       await user.click(quickAddButton);
       await waitFor(() => expect(productTrigger).toBeEnabled());

       await user.click(packagingTrigger);
       await user.click(within(await screen.findByRole('listbox')).getByText('25kg Bag'));

       await waitFor(() => expect(quantityInput).not.toBeDisabled());
       await user.type(quantityInput, '3');
       await user.click(screen.getByRole('button', { name: 'Add Item' }));

       // Should exist both quantities separately (2 and 3)
       await waitFor(() => {
         expect(screen.getAllByText('2').length).toBeGreaterThan(0);
         expect(screen.getAllByText('3').length).toBeGreaterThan(0);
       });

       unmount();
    });
    
    it('handles repeated quick add seamlessly', async () => {
      const { unmount } = render(<MemoryRouter><NewOrder /></MemoryRouter>);
      const user = userEvent.setup();

      // Quick add Neelam Dairy Max
      const quickAddButton = screen.getByRole('button', { name: /Quickly populate Neelam Dairy/i });
      
      // Repeatedly add the same quick add item properly updating the cart
      await user.click(quickAddButton);
      const quantityInput = screen.getByLabelText(/Qty \(Bags\)/i);
      await waitFor(() => expect(quantityInput).not.toBeDisabled());
      await user.type(quantityInput, '10');
      const addBtn = screen.getByRole('button', { name: 'Add Item' });
      await waitFor(() => expect(addBtn).toBeEnabled());
      await user.click(addBtn);

      // Verify it's added
      await waitFor(() => expect(screen.getAllByText('10').length).toBeGreaterThan(0));

      await user.click(quickAddButton);
      await waitFor(() => expect(quantityInput).not.toBeDisabled());
      await user.type(quantityInput, '5');
      await waitFor(() => expect(addBtn).toBeEnabled());
      await user.click(addBtn);

      await user.click(quickAddButton);
      await waitFor(() => expect(quantityInput).not.toBeDisabled());
      await user.type(quantityInput, '5');
      await waitFor(() => expect(addBtn).toBeEnabled());
      await user.click(addBtn);

      await waitFor(() => expect(screen.getAllByText('20').length).toBeGreaterThan(0));
      const rows = screen.getAllByRole('row');
      // header + 1 item row
      expect(rows.length).toBe(2);

      unmount();
    });
  });
});
