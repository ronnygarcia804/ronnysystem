const appContainer = document.getElementById('app')

const DATA_FILE = 'data.json'
const TAX_RATE = 0.18 

let data = { inventory: [], sales: [] }
let cart = []

const fetchData = async () => {
  try {
    const response = await fetch(DATA_FILE)
    const json = await response.json()
    data = json
  } catch (error) {
    data = { inventory: [], sales: [] }
    await saveData()
  }
}

const saveData = async () => {
  try {
    await fetch(DATA_FILE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  } catch (error) {
    console.error('Error al guardar los datos', error)
  }
}

const createNode = (tag, classes = [], content = '', attributes = {}) => {
  const node = document.createElement(tag)
  node.className = classes.join(' ')
  node.innerHTML = content

  Object.keys(attributes).forEach(key => {
    node.setAttribute(key, attributes[key])
  })

  return node
}

const formatCurrency = (value) => value.toFixed(2)

const calculateTotals = () => {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  return { subtotal, tax, total }
}

const renderProducts = () => {
  const productsGrid = document.getElementById('productsGrid')
  if (!productsGrid) return

  productsGrid.innerHTML = data.inventory.map(p => `
    <div class="product-card" data-id="${p.id}">
      <p class="product-name">${p.name}</p>
      <p class="text-xs text-gray-500">Stock: ${p.stock}</p>
      <span class="product-price">$${formatCurrency(p.price)}</span>
    </div>
  `).join('')
}

const renderCart = () => {
  const cartList = document.getElementById('cartList')
  const checkoutBtn = document.getElementById('checkoutBtn')
  if (!cartList || !checkoutBtn) return

  cartList.innerHTML = ''

  if (cart.length === 0) {
    cartList.innerHTML = '<p class="text-gray-500 text-sm">La cesta está vacía</p>'
    checkoutBtn.disabled = true
    return
  }

  cart.forEach(item => {
    const itemNode = createNode('div', ['cart-item'])
    
    const info = createNode('div', ['cart-item-info'])
    info.appendChild(createNode('p', ['font-semibold'], item.name))
    info.appendChild(createNode('p', ['text-xs'], `$${formatCurrency(item.price)} x ${item.quantity}`))

    const actions = createNode('div', ['cart-item-actions'])
    
    const decreaseBtn = createNode('button', ['cart-button'], '-', { 'data-id': item.id, 'data-action': 'decrease' })
    const quantitySpan = createNode('span', ['font-bold'], String(item.quantity))
    const increaseBtn = createNode('button', ['cart-button'], '+', { 'data-id': item.id, 'data-action': 'increase' })
    const removeBtn = createNode('button', ['cart-button', 'text-red'], 'x', { 'data-id': item.id, 'data-action': 'remove' })

    actions.appendChild(decreaseBtn)
    actions.appendChild(quantitySpan)
    actions.appendChild(increaseBtn)
    actions.appendChild(removeBtn)

    itemNode.appendChild(info)
    itemNode.appendChild(actions)
    cartList.appendChild(itemNode)
  })

  checkoutBtn.disabled = false
}

const renderTotals = () => {
  const { subtotal, tax, total } = calculateTotals()

  document.getElementById('subtotalDisplay').innerHTML = `$${formatCurrency(subtotal)}`
  document.getElementById('taxDisplay').innerHTML = `$${formatCurrency(tax)}`
  document.getElementById('totalDisplay').innerHTML = `$${formatCurrency(total)}`
}

const handleAddToCart = (productId) => {
  const product = data.inventory.find(p => p.id === productId)
  if (!product) return

  const cartItem = cart.find(item => item.id === productId)

  if (cartItem) {
    if (cartItem.quantity < product.stock) {
      cartItem.quantity++
    }
  } else {
    if (product.stock > 0) {
      cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 })
    }
  }
  renderCart()
  renderTotals()
}

const handleCartAction = (id, action) => {
  const index = cart.findIndex(item => item.id === id)
  if (index === -1) return

  const product = data.inventory.find(p => p.id === id)

  if (action === 'increase') {
    if (cart[index].quantity < product.stock) {
      cart[index].quantity++
    }
  } else if (action === 'decrease') {
    cart[index].quantity--
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1)
    }
  } else if (action === 'remove') {
    cart.splice(index, 1)
  }

  renderCart()
  renderTotals()
}

const completeCheckout = async () => {
  if (cart.length === 0) return

  const { subtotal, tax, total } = calculateTotals()
  const saleId = Date.now()

  const newSale = {
    id: saleId,
    date: new Date().toISOString(),
    subtotal: subtotal,
    tax: tax,
    total: total,
    items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }))
  }

  cart.forEach(cartItem => {
    const inventoryItem = data.inventory.find(i => i.id === cartItem.id)
    if (inventoryItem) {
      inventoryItem.stock -= cartItem.quantity
    }
  })

  data.sales.push(newSale)
  await saveData()

  renderReceipt(newSale)
  cart = []
  render()
}

const renderReceipt = (sale) => {
  const modal = document.getElementById('salesModal')
  const content = document.getElementById('modalContent')
  if (!modal || !content) return

  content.innerHTML = `
    <h4 class="font-bold text-lg text-center mb-4">Factura #${sale.id}</h4>
    <p class="text-sm text-center mb-4">Fecha: ${new Date(sale.date).toLocaleString()}</p>
    <div class="border-t border-b py-2 mb-4">
      <div class="flex font-semibold text-xs mb-1">
        <span style="width: 60%">Producto</span>
        <span style="width: 15%">Cant.</span>
        <span style="width: 25%; text-align: right;">Total</span>
      </div>
      ${sale.items.map(item => `
        <div class="flex text-sm">
          <span style="width: 60%">${item.name}</span>
          <span style="width: 15%">${item.quantity}</span>
          <span style="width: 25%; text-align: right;">$${formatCurrency(item.price * item.quantity)}</span>
        </div>
      `).join('')}
    </div>
    <div class="text-right">
      <p>Subtotal: $${formatCurrency(sale.subtotal)}</p>
      <p>Impuesto (${TAX_RATE * 100}%): $${formatCurrency(sale.tax)}</p>
      <p class="text-xl font-bold text-red-500 mt-2">TOTAL: $${formatCurrency(sale.total)}</p>
    </div>
  `
  modal.classList.add('open')
}

const closeModal = () => {
  const modal = document.getElementById('salesModal')
  if (modal) modal.classList.remove('open')
}

const renderMainView = () => {
  appContainer.innerHTML = ''
  appContainer.appendChild(createNode('h1', ['title'], 'RonnyFacturacion - Punto de Venta'))

  const posLayout = createNode('div', ['pos-layout'])

  const productsPanel = createNode('section', ['panel'])
  productsPanel.appendChild(createNode('h2', ['text-xl', 'font-semibold', 'mb-4'], 'Catálogo de Productos'))
  productsPanel.appendChild(createNode('div', ['product-grid'], '', { id: 'productsGrid' }))
  productsPanel.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card')
    if (card) handleAddToCart(Number(card.dataset.id))
  })
  posLayout.appendChild(productsPanel)

  const cartPanel = createNode('section', ['panel', 'flex', 'flex-col'])
  cartPanel.appendChild(createNode('h2', ['text-xl', 'font-semibold', 'mb-4'], 'Cesta de Venta'))
  
  const cartListContainer = createNode('div', ['cart-list'], '', { id: 'cartList' })
  cartListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.cart-button')
    if (btn) handleCartAction(Number(btn.dataset.id), btn.dataset.action)
  })
  cartPanel.appendChild(cartListContainer)

  const totals = createNode('div', ['totals'])
  totals.appendChild(createNode('div', ['total-row'], 'Subtotal: <span id="subtotalDisplay">$0.00</span>'))
  totals.appendChild(createNode('div', ['total-row'], `Impuesto (${TAX_RATE * 100}%): <span id="taxDisplay">$0.00</span>`))
  totals.appendChild(createNode('div', ['total-row', 'total-final'], 'TOTAL: <span id="totalDisplay">$0.00</span>'))
  cartPanel.appendChild(totals)

  const checkoutBtn = createNode('button', ['button', 'button-checkout'], 'PAGAR Y FACTURAR', { id: 'checkoutBtn', disabled: true })
  checkoutBtn.addEventListener('click', completeCheckout)

  const cancelBtn = createNode('button', ['button', 'button-cancel'], 'CANCELAR VENTA', { id: 'cancelBtn' })
  cancelBtn.addEventListener('click', () => {
    cart = []
    render()
  })

  cartPanel.appendChild(checkoutBtn)
  cartPanel.appendChild(cancelBtn)
  posLayout.appendChild(cartPanel)

  appContainer.appendChild(posLayout)
}

const renderModal = () => {
  const modal = createNode('div', ['modal-backdrop'], '', { id: 'salesModal' })
  const content = createNode('div', ['modal-content', 'relative'])
  
  const closeBtn = createNode('button', ['close-btn'], '×')
  closeBtn.addEventListener('click', closeModal)
  
  content.appendChild(closeBtn)
  content.appendChild(createNode('div', [], '', { id: 'modalContent' }))
  modal.appendChild(content)
  appContainer.appendChild(modal)
}

const render = () => {
  renderMainView()
  renderProducts()
  renderCart()
  renderTotals()
  if (!document.getElementById('salesModal')) {
    renderModal()
  }
}

const init = async () => {
  await fetchData()
  if (data.inventory.length === 0) {
    data.inventory = [
      { id: 101, name: 'Tijeras de Precisión', price: 45.99, stock: 15 },
      { id: 102, name: 'Gel Fijador 250ml', price: 8.50, stock: 120 },
      { id: 103, name: 'Champú Hidratante', price: 15.00, stock: 80 },
      { id: 104, name: 'Crema para Afeitar', price: 12.99, stock: 60 },
      { id: 105, name: 'Toalla Desechable x100', price: 20.00, stock: 30 },
      { id: 106, name: 'Laca Capilar Mega', price: 9.99, stock: 90 }
    ]
    await saveData()
  }
  render()
}

init()