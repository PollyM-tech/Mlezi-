import { it, expect } from 'vitest'
import { containsContact, assertNoContact, safePublicText } from '../../convex/lib/contactPolicy.js'
it.each([
 'Call 0712345678', 'Call +254 712 345 678', '07-12-34-56-78',
 'care@example.com', 'care [at] example [dot] com', 'care at example dot com',
 'https://example.com', 'wa.me/254712345678', 'Telegram @myname',
 'zero seven one two three four five six seven eight',
 '０７１２３４５６７８', '٠٧١٢٣٤٥٦٧٨', '07\u200b12345678',
 'Find me at example.co.ke',
])('blocks contact exchange: %s', value=>{
 expect(containsContact(value)).toBe(true)
 expect(()=>assertNoContact([value])).toThrow('private contact fields')
 expect(safePublicText(value)).toBe('[Contact details removed]')
})
it.each(['Five years caring for children aged 2–5.', 'Expected pay KES 15,000–20,000 monthly.', 'Nairobi, available Monday to Friday.', 'First aid and infant care'])('retains ordinary care information: %s',value=>{
 expect(containsContact(value)).toBe(false)
 expect(safePublicText(value)).toBe(value)
})
it('blocks a phone number split across skill or language entries',()=>{
 expect(()=>assertNoContact([['0712','345','678']])).toThrow()
 expect(safePublicText(['0712','345','678'])).toEqual(['[Contact details removed]'])
})
