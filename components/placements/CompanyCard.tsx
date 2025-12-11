// ============================================
// FIXED: CompanyCard Component
// FILE: components/placements/CompanyCard.tsx
// ============================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  industry: string;
  ctc_range: string;
  roles?: string[];
  about: string;
  offer_type: string;
  category: string;
}

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/placements/company/${company.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{company.name}</CardTitle>
                <p className="text-sm text-gray-500">{company.industry}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">CTC Range</p>
              <p className="text-lg font-bold text-green-600">{company.ctc_range}</p>
            </div>
            <div>
              <div className="flex flex-wrap gap-1 mt-1">
{company.roles && company.roles.length > 0 ? (
  <div>
    <p className="text-sm font-semibold text-gray-700">Roles</p>
    <div className="flex flex-wrap gap-1 mt-1">
{(company.roles || []).map((role: string, idx: number) => (        
    <Badge key={idx} variant="secondary">{role}</Badge>
      ))}
    </div>
  </div>
) : null}
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{company.about}</p>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge variant="outline">{company.offer_type}</Badge>
              <Badge>{company.category}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}