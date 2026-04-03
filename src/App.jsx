import { useEffect, useMemo, useState } from 'react'
import { categories, products } from './data.js'

const CART_KEY = 'optimized-store-cart'

function readCart() {
  try {
    const stored = localStorage.getItem(CART_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function sendAnalyticsEvent(type, payload) {
  const event = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  }

  console.log('[Yandex.Metrika]', event)
  console.log('[Google Analytics]', event)
  return event
}

function ProductCard({ product, onAdd }) {
  const [slide, setSlide] = useState(0)

  return (
    <article className="product-card">
      <div className="slider-shell">
        <img
          src={product.images[slide]}
          alt={product.title}
          loading="lazy"
          width="800"
          height="600"
        />
        <div className="slider-dots">
          {product.images.map((image, index) => (
            <button
              type="button"
              key={image}
              className={index === slide ? 'dot active' : 'dot'}
              onClick={() => setSlide(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="product-body">
        <p className="category-label">{product.category}</p>
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <div className="product-bottom">
          <strong>{product.price.toLocaleString('ru-RU')} ₽</strong>
          <span>★ {product.rating}</span>
        </div>
        <button type="button" className="buy-btn" onClick={() => onAdd(product)}>
          Добавить в корзину
        </button>
      </div>
    </article>
  )
}

export default function App() {
  const [cart, setCart] = useState(readCart)
  const [activeCategory, setActiveCategory] = useState('Все')
  const [city, setCity] = useState('Москва')
  const [deliveryType, setDeliveryType] = useState('Курьер')
  const [analyticsFeed, setAnalyticsFeed] = useState([
    { type: 'page_view', payload: 'Главная витрина', timestamp: new Date().toISOString() },
  ])
  const [webVitals, setWebVitals] = useState({ lcp: '—', cls: '—', fcp: '—' })

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const paintEntry = performance.getEntriesByName('first-contentful-paint')[0]
    if (paintEntry) {
      setWebVitals((prev) => ({ ...prev, fcp: `${Math.round(paintEntry.startTime)} ms` }))
    }

    let clsValue = 0
    const observers = []

    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            setWebVitals((prev) => ({ ...prev, lcp: `${Math.round(lastEntry.startTime)} ms` }))
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        observers.push(lcpObserver)
      } catch {
        setWebVitals((prev) => ({ ...prev, lcp: 'n/a' }))
      }

      try {
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
              setWebVitals((prev) => ({ ...prev, cls: clsValue.toFixed(3) }))
            }
          })
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
        observers.push(clsObserver)
      } catch {
        setWebVitals((prev) => ({ ...prev, cls: 'n/a' }))
      }
    }

    return () => observers.forEach((observer) => observer.disconnect())
  }, [])

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) => activeCategory === 'Все' || product.category === activeCategory,
      ),
    [activeCategory],
  )

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const deliveryPrice = useMemo(() => {
    const regionFactor = city === 'Москва' ? 1 : city === 'Санкт-Петербург' ? 1.15 : 1.35
    const methodFactor = deliveryType === 'Пункт выдачи' ? 0.75 : 1
    const base = cart.length ? Math.max(...cart.map((item) => item.deliveryBase)) : 390
    return Math.round(base * regionFactor * methodFactor)
  }, [cart, city, deliveryType])

  const addToCart = (product) => {
    setCart((current) => {
      const sameItem = current.find((item) => item.id === product.id)
      if (sameItem) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })

    setAnalyticsFeed((current) =>
      [sendAnalyticsEvent('add_to_cart', product.title), ...current].slice(0, 4),
    )
  }

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="store-shell">
      <header className="store-hero">
        <p className="eyebrow">Digital Agency St</p>
        <h1>Оптимизированный интернет-магазин с lazy loading и performance-метриками</h1>
        <p className="hero-text">
          Портфолио-витрина с интерактивными карточками, калькулятором доставки,
          корзиной и имитацией аналитики Яндекс.Метрики + Google Analytics.
        </p>
      </header>

      <section className="toolbar-row">
        <div className="filters-pills">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? 'pill active' : 'pill'}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="cart-counter">В корзине: {cart.reduce((sum, item) => sum + item.quantity, 0)}</div>
      </section>

      <main className="shop-grid">
        <section className="catalog-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </section>

        <aside className="cart-panel">
          <h2>Корзина и доставка</h2>

          {cart.length === 0 ? (
            <p className="empty-cart">Пока корзина пустая — выбери товар из каталога.</p>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div className="cart-line" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.quantity} × {item.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <button type="button" onClick={() => removeFromCart(item.id)}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="delivery-box">
            <label>
              Город доставки
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                <option>Москва</option>
                <option>Санкт-Петербург</option>
                <option>Казань</option>
              </select>
            </label>

            <label>
              Способ доставки
              <select
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option>Курьер</option>
                <option>Пункт выдачи</option>
              </select>
            </label>

            <div className="summary-row">
              <span>Товары</span>
              <strong>{cartTotal.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="summary-row">
              <span>Доставка</span>
              <strong>{deliveryPrice.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="summary-row total">
              <span>Итого</span>
              <strong>{(cartTotal + deliveryPrice).toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>

          <div className="analytics-box">
            <p className="eyebrow">Аналитика</p>
            {analyticsFeed.map((event, index) => (
              <div className="analytics-item" key={`${event.timestamp}-${index}`}>
                <span>{event.type}</span>
                <strong>{String(event.payload)}</strong>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer className="perf-footer">
        <span>LCP: {webVitals.lcp}</span>
        <span>FCP: {webVitals.fcp}</span>
        <span>CLS: {webVitals.cls}</span>
      </footer>
    </div>
  )
}
