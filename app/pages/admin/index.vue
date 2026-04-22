<script setup lang="ts">
// เปลี่ยนเส้นทางไปยังหน้าสรุปยอดปิดร้านโดยอัตโนมัติ
definePageMeta({ layout: 'admin' })
navigateTo('/admin/closing-report', { replace: true })
</script>
