/** @format */

'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  IconSearch, 
  IconTruck, 
  IconUsers, 
  IconListDetails,
  IconChevronRight,
  IconLoader2,
  IconInbox
} from '@tabler/icons-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const { activeOrgId, sessionId } = useOrg();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const results = useQuery(
    api.search.search,
    activeOrgId && debouncedQuery.length >= 2
      ? { orgId: activeOrgId, query: debouncedQuery, sessionId }
      : 'skip'
  );

  const isLoading = debouncedQuery.length >= 2 && results === undefined;
  const hasResults = results && ((results.shipments?.length || 0) > 0 || (results.users?.length || 0) > 0 || (results.quotes?.length || 0) > 0);

  return (
    <div className='flex-1 flex flex-col gap-8 px-6 py-8 lg:p-12 max-w-5xl mx-auto w-full animate-in fade-in duration-500'>
      <div className='space-y-2 flex flex-col items-center text-center mb-4'>
        <div className='bg-primary/10 p-3 rounded-2xl mb-2'>
            <IconSearch className='h-8 w-8 text-primary' />
        </div>
        <h2 className='text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent uppercase'>
          Universal Search
        </h2>
        <p className='text-muted-foreground text-sm font-medium tracking-wide max-w-md'>
          Search across shipments, users, and quotes in real-time.
        </p>
      </div>

      <div className='relative group max-w-2xl mx-auto w-full'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200'></div>
        <div className='relative'>
            <IconSearch className='absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/40 group-focus-within:text-primary transition-colors' />
            <Input
              placeholder='Search anything...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-14 h-16 text-xl bg-background/80 backdrop-blur-xl border-border/40 rounded-2xl shadow-2xl shadow-primary/5 focus-visible:ring-primary/20 transition-all font-medium'
              autoFocus
            />
            {isLoading && (
              <div className='absolute right-5 top-1/2 -translate-y-1/2'>
                <IconLoader2 className='h-6 w-6 text-primary animate-spin' />
              </div>
            )}
        </div>
      </div>

      <div className='grid gap-10 mt-4'>
        {debouncedQuery.length < 2 && !isLoading && (
          <div className='flex flex-col items-center justify-center py-24 text-center space-y-6 opacity-30 group grayscale hover:grayscale-0 transition-all'>
             <div className='bg-muted rounded-full p-8 group-hover:bg-primary/10 group-hover:text-primary transition-colors'>
                <IconSearch size={48} strokeWidth={1.5} />
             </div>
             <div className='space-y-1'>
                <p className='font-black uppercase tracking-[0.2em] text-xs'>Initialization Required</p>
                <p className='text-muted-foreground text-sm font-medium'>
                    Enter at least 2 characters to begin deep search.
                </p>
             </div>
          </div>
        )}

        {debouncedQuery.length >= 2 && !isLoading && !hasResults && (
          <div className='flex flex-col items-center justify-center py-24 text-center space-y-6'>
             <div className='bg-rose-500/10 text-rose-500 rounded-full p-8 animate-pulse'>
                <IconInbox size={48} strokeWidth={1.5} />
             </div>
             <div className='space-y-1'>
                <p className='font-black uppercase tracking-[0.2em] text-xs text-rose-500'>Null Reference</p>
                <p className='text-muted-foreground text-sm font-medium'>
                   No data points matching <span className='text-foreground font-bold'>"{debouncedQuery}"</span> were found.
                </p>
             </div>
          </div>
        )}

        {(results?.shipments?.length || 0) > 0 && (
          <section className='space-y-4 animate-in slide-in-from-bottom-4 duration-500'>
            <div className='flex items-center gap-3 px-1'>
              <div className='p-2 bg-primary/10 rounded-lg'>
                <IconTruck size={16} className='text-primary' />
              </div>
              <span className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground'>Manifests Found ({results?.shipments?.length})</span>
            </div>
            <div className='grid gap-3'>
              {results?.shipments?.map((shipment: any) => (
                <Link key={shipment._id} href={`/shipments/${shipment._id}`}>
                  <Card className='hover:bg-accent/50 border-border/40 transition-all group cursor-pointer hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 rounded-xl overflow-hidden'>
                    <CardContent className='p-5 flex items-center justify-between'>
                      <div className='flex items-center gap-5'>
                        <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform'>
                          <IconTruck size={24} />
                        </div>
                        <div className='space-y-1'>
                          <div className='font-black tracking-tight flex items-center gap-3 text-lg'>
                            {shipment.tracking_number}
                            <Badge variant='outline' className={cn(
                                'text-[9px] uppercase font-black tracking-widest h-5 px-2 border-primary/20 bg-primary/5 text-primary',
                                shipment.status === 'delivered' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                (shipment.status === 'exception' || shipment.status === 'failed_attempt') && 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            )}>
                              {shipment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className='text-[11px] font-bold text-muted-foreground/60 flex items-center gap-3 uppercase tracking-wider'>
                            <span>{shipment.customer_name || 'Anonymous Sender'}</span>
                            <span className='w-1 h-1 rounded-full bg-border/60' />
                            <span>{shipment.carrier_name || shipment.carrier_code}</span>
                          </div>
                        </div>
                      </div>
                      <div className='p-2 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2'>
                        <IconChevronRight className='text-primary' size={18} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(results?.users?.length || 0) > 0 && (
          <section className='space-y-4 animate-in slide-in-from-bottom-6 duration-700'>
            <div className='flex items-center gap-3 px-1'>
              <div className='p-2 bg-secondary/10 rounded-lg'>
                <IconUsers size={16} className='text-secondary-foreground' />
              </div>
              <span className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground'>Entity Database ({results?.users?.length})</span>
            </div>
            <div className='grid gap-3'>
              {results?.users?.map((user: any) => (
                <Link key={user._id} href={`/dashboard/users`}>
                  <Card className='hover:bg-accent/50 border-border/40 transition-all group cursor-pointer hover:shadow-xl hover:shadow-secondary/5 hover:-translate-y-0.5 rounded-xl overflow-hidden'>
                    <CardContent className='p-5 flex items-center justify-between'>
                      <div className='flex items-center gap-5'>
                        <div className='w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary-foreground group-hover:scale-110 transition-transform'>
                          <IconUsers size={24} />
                        </div>
                        <div className='space-y-1'>
                          <div className='font-black tracking-tight flex items-center gap-3 text-lg'>
                            {user.name || 'Unknown Entity'}
                            <Badge variant='secondary' className='text-[9px] uppercase font-black tracking-widest h-5 px-2 bg-secondary text-secondary-foreground'>
                              {user.role}
                            </Badge>
                          </div>
                          <div className='text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider'>
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className='p-2 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2'>
                        <IconChevronRight className='text-primary' size={18} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(results?.quotes?.length || 0) > 0 && (
          <section className='space-y-4 animate-in slide-in-from-bottom-8 duration-900'>
            <div className='flex items-center gap-3 px-1'>
              <div className='p-2 bg-muted rounded-lg'>
                <IconListDetails size={16} className='text-muted-foreground' />
              </div>
              <span className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground'>Quotation Registry ({results?.quotes?.length})</span>
            </div>
            <div className='grid gap-3'>
              {results?.quotes?.map((quote: any) => (
                <Link key={quote._id} href={`/quotes`}>
                  <Card className='hover:bg-accent/50 border-border/40 transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 rounded-xl overflow-hidden'>
                    <CardContent className='p-5 flex items-center justify-between'>
                      <div className='flex items-center gap-5'>
                        <div className='w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform'>
                          <IconListDetails size={24} />
                        </div>
                        <div className='space-y-1'>
                          <div className='font-black tracking-tight flex items-center gap-3 text-lg'>
                            {quote.parcelDetails.description}
                            <Badge variant='outline' className='text-[9px] uppercase font-black tracking-widest h-5 px-2'>
                              {quote.status}
                            </Badge>
                          </div>
                          <div className='text-[11px] font-bold text-muted-foreground/60 flex items-center gap-3 uppercase tracking-wider'>
                            <span>{quote.origin.city}</span>
                            <IconChevronRight size={10} strokeWidth={3} className='text-primary/40' />
                            <span>{quote.destination.city}</span>
                          </div>
                        </div>
                      </div>
                      <div className='p-2 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2'>
                        <IconChevronRight className='text-primary' size={18} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
