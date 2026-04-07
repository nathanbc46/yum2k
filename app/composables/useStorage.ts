/**
 * composables/useStorage.ts
 * จัดการการย่อขนาดรูปภาพ (Client-side Resize) และการอัปโหลดไปยัง Supabase Storage
 */

export function useStorage() {
  const supabase = useSupabaseClient()

  /**
   * ย่อขนาดรูปภาพโดยใช้ Canvas ก่อนอัปโหลด
   * ป้องกันการอัปโหลดไฟล์ขนาดใหญ่เกินความจำเป็น (เหมาะกับ POS บน Tablet)
   * 
   * @param file - ไฟล์ต้นฉบับจาก input
   * @param maxWidth - ความกว้างสูงสุด (default 800px)
   * @param quality - คุณภาพรูปภาพ 0-1 (default 0.8)
   */
  async function resizeImage(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // คำนวณอัตราส่วนเพื่อย่อขนาด
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // แปลงเป็น Blob (WebP ถ้า Browser รองรับ ถ้าไม่ใช้ JPEG)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob)
              else reject(new Error('Canvas to Blob failed'))
            },
            'image/webp',
            quality
          )
        }
      }
      reader.onerror = (err) => reject(err)
    })
  }

  /**
   * อัปโหลดรูปภาพไปยัง Supabase Storage Bucket 'products'
   * 
   * @param file - ไฟล์รูปภาพ (Blob/File)
   * @param path - ชื่อไฟล์ที่จะเก็บใน Storage (แนะนำให้ใช้ uuid)
   */
  async function uploadProductImage(file: Blob | File, path: string): Promise<string> {
    const bucket = 'products'
    
    // 1. อัปโหลดไฟล์ (Upsert เพื่อให้ทับรูปเดิมถ้ามีการเปลี่ยนรูป)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      })

    if (error) {
      console.error('❌ Upload Error:', error)
      throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${error.message}`)
    }

    // 2. ดึง Public URL ของรูปภาพกลับมา
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }

  return {
    resizeImage,
    uploadProductImage
  }
}
