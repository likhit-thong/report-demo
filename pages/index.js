import Link from 'next/link';
export default function Home() {
  return (
    <div style={{ margin: '12px', textAlign: 'center' }}>
      <h1>Mari Report</h1>
      <p>
        <Link href="/mari-report">
          <a>Timeout Report</a>
        </Link>
      </p>
      <p>
        <Link href="/mari-report-error">
          <a>Error Report</a>
        </Link>
      </p>
    </div>
  );
}
