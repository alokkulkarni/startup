import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineChart } from './LineChart'

const mockData = [
  { date: '2024-01-01', requests: 10 },
  { date: '2024-01-02', requests: 20 },
  { date: '2024-01-03', requests: 15 },
  { date: '2024-01-04', requests: 25 },
  { date: '2024-01-05', requests: 30 },
  { date: '2024-01-06', requests: 5 },
]

describe('LineChart', () => {
  it('renders "No data" message when data array is empty', () => {
    render(<LineChart data={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders an SVG element when data is provided', () => {
    const { container } = render(<LineChart data={mockData} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders the correct number of data point circles', () => {
    const { container } = render(<LineChart data={mockData} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(mockData.length)
  })

  it('renders date labels for data points', () => {
    render(<LineChart data={mockData} />)
    // first label (index 0): "2024-01-01" → slice(5) = "01-01"
    expect(screen.getByText('01-01')).toBeInTheDocument()
    // last label: "2024-01-06" → "01-06"
    expect(screen.getByText('01-06')).toBeInTheDocument()
  })

  it('renders the label text when provided', () => {
    render(<LineChart data={mockData} label="Daily Requests" />)
    expect(screen.getByText('Daily Requests')).toBeInTheDocument()
  })

  it('renders both area and line paths', () => {
    const { container } = render(<LineChart data={mockData} />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2) // area + line
  })
})
