import { supabase, isCloudConfigured } from "@/lib/supabase";

export async function uploadProductImage(file: File): Promise<string> {
  if (isCloudConfigured() && supabase) {
    const path = `products/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      if (data.publicUrl) return data.publicUrl;
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}
