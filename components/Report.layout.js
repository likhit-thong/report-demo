import styles from './Report.module.css';
export default function ReportLayout({ childred }) {
  return <div className={styles.Flex_container}>{childred}</div>;
}
