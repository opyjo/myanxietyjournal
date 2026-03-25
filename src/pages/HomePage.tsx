import { APP_NAME, crisisSupportCopy } from "../../shared/constants";
import { useAuth } from "../hooks/useAuth";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { firebaseReady, signInWithGoogle } = useAuth();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroPanel}>
          <div className={styles.brandPill}>Warm private tracking for anxious days</div>
          <p className={styles.eyebrow}>Built for low-energy moments, not perfect journaling</p>
          <h1 className={styles.title}>{APP_NAME}</h1>
          <p className={styles.copy}>
            Track anxiety, energy, sleep, symptoms, triggers, and medication in one
            calm routine. When you want a bigger picture, generate supportive AI
            insights and a clinician-ready note for your next appointment.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => signInWithGoogle()}
              disabled={!firebaseReady}
            >
              Sign in with Google
            </button>
            <p className={styles.helperText}>
              Private check-ins, on-demand AI insights, and a clean note for care visits.
            </p>
          </div>
          <div className={styles.statRow}>
            <article className={styles.statCard}>
              <p className={styles.statValue}>1 min</p>
              <p className={styles.statLabel}>to log today</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statValue}>On demand</p>
              <p className={styles.statLabel}>Claude pattern review</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statValue}>Copy ready</p>
              <p className={styles.statLabel}>for therapist or doctor</p>
            </article>
          </div>
        </div>
        <div className={styles.featureRail}>
          <article className={styles.featureCardLarge}>
            <p className={styles.cardLabel}>Daily check-in</p>
            <p className={styles.cardValue}>
              One clean screen for anxiety, mood, sleep, energy, and symptoms.
            </p>
            <p className={styles.cardMeta}>Made to feel light when your head does not.</p>
          </article>
          <article className={styles.featureCard}>
            <p className={styles.cardLabel}>AI insights</p>
            <p className={styles.cardValue}>
              Claude looks across entries only when you ask, then surfaces calm, discussable trends.
            </p>
          </article>
          <article className={styles.featureCard}>
            <p className={styles.cardLabel}>Appointment prep</p>
            <p className={styles.cardValue}>
              Generate a concise clinician note with symptoms, triggers, sleep context, and medication adherence.
            </p>
          </article>
        </div>
      </section>
      <aside className={styles.notice}>
        <span className={styles.noticeLabel}>Important</span>
        <span>{crisisSupportCopy}</span>
      </aside>
    </div>
  );
}
