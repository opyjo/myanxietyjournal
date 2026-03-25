import { APP_NAME, crisisSupportCopy } from "../../shared/constants";
import { useAuth } from "../hooks/useAuth";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { firebaseReady, signInWithGoogle } = useAuth();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroPanel}>
          <p className={styles.eyebrow}>Warm, private, and simple when you need it most</p>
          <h1 className={styles.title}>{APP_NAME}</h1>
          <p className={styles.copy}>
            Track anxiety, energy, sleep, symptoms, triggers, and medication in one
            calm routine. When you want a bigger picture, generate supportive AI
            insights and a clinician-ready note for your next appointment.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => signInWithGoogle()}
            disabled={!firebaseReady}
          >
            Sign in with Google
          </button>
          {!firebaseReady ? (
            <p className={styles.configNotice}>
              Add your Firebase web config in `.env.local` before signing in.
            </p>
          ) : null}
        </div>
        <div className={styles.stack}>
          <article className={styles.glassCard}>
            <p className={styles.cardLabel}>Daily check-in</p>
            <p className={styles.cardValue}>Anxiety, mood, energy, sleep, symptoms</p>
          </article>
          <article className={styles.glassCard}>
            <p className={styles.cardLabel}>AI insights</p>
            <p className={styles.cardValue}>
              On-demand pattern analysis using Claude Sonnet 4
            </p>
          </article>
          <article className={styles.glassCard}>
            <p className={styles.cardLabel}>Appointment prep</p>
            <p className={styles.cardValue}>
              Copy a structured note for a doctor or therapist in one tap
            </p>
          </article>
        </div>
      </section>
      <aside className={styles.notice}>{crisisSupportCopy}</aside>
    </div>
  );
}
