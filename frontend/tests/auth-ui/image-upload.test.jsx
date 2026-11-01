import { it, expect, vi, afterEach } from 'vitest'
import { prepareUploadImage } from '../../src/lib/imageUpload.js'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('reduces a large phone image before upload and releases the decoded bitmap', async () => {
  const close=vi.fn(), drawImage=vi.fn(), canvas={width:0,height:0,getContext:()=>({fillRect:vi.fn(),drawImage}),toBlob:callback=>callback(new Blob(['jpeg'],{type:'image/jpeg'}))}
  vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:8000,height:6000,close}))
  vi.spyOn(document,'createElement').mockReturnValue(canvas)
  const result=await prepareUploadImage(new Blob(['source'],{type:'image/jpeg'}))
  expect(canvas.width).toBe(2400);expect(canvas.height).toBe(1800)
  expect(result.type).toBe('image/jpeg');expect(drawImage).toHaveBeenCalled();expect(close).toHaveBeenCalledOnce()
})
it('gives a useful error for corrupt or unsupported images', async () => {
  vi.stubGlobal('createImageBitmap',vi.fn().mockRejectedValue(new Error('decode failure')))
  await expect(prepareUploadImage(new Blob(['invalid']))).rejects.toThrow('export your phone photo as JPEG')
})
