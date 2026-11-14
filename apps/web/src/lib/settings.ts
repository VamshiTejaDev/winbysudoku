import { createClient } from './supabase/server';

/**
 * Reads public-safe configuration settings from the database.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) {
      return defaultValue;
    }

    return data.value as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Checks whether the 18+ age confirmation checkbox is required.
 */
export async function isAgeCheckRequired(): Promise<boolean> {
  return await getSetting<boolean>('age_check_required', true);
}

/**
 * Gets the configured brand name or placeholder.
 */
export async function getBrandName(): Promise<string> {
  return await getSetting<string>('brand_name', 'BRAND_NAME');
}

