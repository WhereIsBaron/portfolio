import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface LayoutValue {
  projectOrder: string[]; // array of project names
  imageOrder: Record<string, string[]>; // slug -> ordered image paths
  loading: boolean;
  status: string | null;
  saveProjectOrder: (names: string[]) => Promise<void>;
  saveImageOrder: (slug: string, images: string[]) => Promise<void>;
}

const ROW_ID = 'default';
const LayoutContext = createContext<LayoutValue | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projectOrder, setProjectOrder] = useState<string[]>([]);
  const [imageOrder, setImageOrder] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const imageOrderRef = useRef<Record<string, string[]>>({});
  useEffect(() => {
    imageOrderRef.current = imageOrder;
  }, [imageOrder]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('portfolio_layout')
        .select('project_order, image_order')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (!active) return;
      if (!error && data) {
        setProjectOrder(Array.isArray(data.project_order) ? data.project_order : []);
        setImageOrder(
          data.image_order && typeof data.image_order === 'object' ? data.image_order : {}
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const flash = (message: string, ms = 2500) => {
    setStatus(message);
    if (ms > 0) window.setTimeout(() => setStatus((s) => (s === message ? null : s)), ms);
  };

  const persist = useCallback(async (patch: Record<string, unknown>) => {
    if (!supabase) {
      flash('Supabase is not configured yet.', 4000);
      return;
    }
    const { error } = await supabase
      .from('portfolio_layout')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', ROW_ID);
    if (error) flash('Could not save: ' + error.message, 6000);
    else flash('Arrangement saved for all visitors.');
  }, []);

  const saveProjectOrder = useCallback(
    async (names: string[]) => {
      setProjectOrder(names);
      if (!user) return;
      await persist({ project_order: names });
    },
    [user, persist]
  );

  const saveImageOrder = useCallback(
    async (slug: string, images: string[]) => {
      const next = { ...imageOrderRef.current, [slug]: images };
      imageOrderRef.current = next;
      setImageOrder(next);
      if (!user) return;
      await persist({ image_order: next });
    },
    [user, persist]
  );

  return (
    <LayoutContext.Provider
      value={{ projectOrder, imageOrder, loading, status, saveProjectOrder, saveImageOrder }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
