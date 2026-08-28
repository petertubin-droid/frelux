import { useState, useEffect } from 'react';
import { Loader2, Plus, Save, X, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CONDITIONS = [
  { key: 'new_wall', name: 'New Wall', desc: 'Freshly plastered or newly built wall' },
  { key: 'previously_painted', name: 'Previously Painted', desc: 'Wall with existing paint layer' },
  { key: 'smooth', name: 'Smooth Surface', desc: 'Even, well-prepared surface' },
  { key: 'rough', name: 'Rough Surface', desc: 'Uneven or textured surface' },
  { key: 'dirty', name: 'Dirty Surface', desc: 'Dust, grease, or stains present' },
  { key: 'damp', name: 'Damp Affected', desc: 'Moisture or water damage visible' },
  { key: 'cracked', name: 'Cracked Surface', desc: 'Visible cracks in the wall' },
];

export default function AdminSurfaceConditions() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Surface Conditions</h1><p className="text-sm text-muted-foreground mt-1">Manage configurable surface condition options and their preparation recommendations.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONDITIONS.map((c) => (
          <div key={c.key} className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <h3 className="font-semibold mb-1">{c.name}</h3>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="rounded-lg p-1.5 hover:bg-muted transition-all hover:scale-110"><Edit className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
