import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// This page is already routed at /listings/new (sell) and /listings/:id (edit),
// and both routes are wrapped in <ProtectedRoute>.

const defaults = { title: '', description: '', price: 0, category: 'other', condition: 'used', status: 'active' }

export default function ListingForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [loadedId, setLoadedId] = useState(null)

  // Ignore an old response if the user leaves or switches listings.
  useEffect(() => {
    let cancelled = false
    setError('')
    setForm(defaults)
    setLoadedId(null)
    setLoading(Boolean(id))
    if (!id) return

    api.get('/listings/' + id)
      .then(res => {
        if (cancelled) return
        const listing = res.data.listing
        setForm({
          title: listing.title,
          price: Number(listing.price),
          category: listing.category,
          condition: listing.condition,
          description: listing.description || '',
          status: listing.status
        })
        setLoadedId(id)
      })
      .catch(err => {
        if (!cancelled) setError(err?.response?.data?.message || 'Unable to load listing')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  function onChange(e) {
    const { name, value } = e.target
    // An empty price stays blank so required validation can catch it.
    setForm(prev => ({ ...prev, [name]: name === 'price' && value !== '' ? Number(value) : value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (saving || loading || (id && loadedId !== id)) return
    setError('')
    if (form.title.trim().length < 2) {
      setError('Title must be at least 2 characters')
      return
    }
    if (typeof form.price !== 'number' || !Number.isFinite(form.price) || form.price < 0) {
      setError('Enter a price of 0 or more')
      return
    }
    if (!['textbooks', 'electronics', 'furniture', 'clothing', 'other'].includes(form.category) ||
        !['new', 'like-new', 'used', 'worn'].includes(form.condition) ||
        (id && !['active', 'sold'].includes(form.status))) {
      setError('Choose a valid category, condition and status')
      return
    }

    // Send only editable fields; the server gets the seller from the JWT.
    const body = {
      title: form.title.trim(),
      price: form.price,
      category: form.category,
      condition: form.condition,
      description: form.description
    }
    setSaving(true)
    try {
      if (id) {
        await api.patch('/listings/' + id, { ...body, status: form.status })
      } else {
        await api.post('/listings', body)
      }
      nav('/listings')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save listing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'New'} Listing</h1>
      {loading && <p className="text-sm text-zinc-600 mb-3" role="status">Loading listing...</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <fieldset disabled={loading || saving || Boolean(id && loadedId !== id)} className="space-y-3">
          <div>
            <label htmlFor="title" className="block text-sm mb-1">Title</label>
            <input id="title" name="title" className="input" type="text" placeholder="Calculus textbook" required minLength={2} value={form.title} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm mb-1">Price</label>
            <input id="price" name="price" className="input" type="number" required min="0" step="any" value={form.price} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm mb-1">Category</label>
            <select id="category" name="category" className="input" required value={form.category} onChange={onChange}>
              <option value="textbooks">Textbooks</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="clothing">Clothing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="condition" className="block text-sm mb-1">Condition</label>
            <select id="condition" name="condition" className="input" required value={form.condition} onChange={onChange}>
              <option value="new">New</option>
              <option value="like-new">Like new</option>
              <option value="used">Used</option>
              <option value="worn">Worn</option>
            </select>
          </div>
          {id && (
            <div>
              <label htmlFor="status" className="block text-sm mb-1">Status</label>
              <select id="status" name="status" className="input" required value={form.status} onChange={onChange}>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="description" className="block text-sm mb-1">Description (optional)</label>
            <textarea id="description" name="description" className="input" rows={3} value={form.description} onChange={onChange} />
          </div>
          <button className="btn disabled:opacity-50 disabled:cursor-not-allowed" type="submit">{saving ? 'Saving...' : 'Save'}</button>
        </fieldset>
        {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
      </form>
    </div>
  )
}
