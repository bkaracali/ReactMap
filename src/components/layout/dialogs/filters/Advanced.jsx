// @ts-check
import * as React from 'react'
import { DialogContent, List, ListItem, Dialog } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import {
  useStore,
  useStatic,
  useDeepStore,
  useLayoutStore,
} from '@hooks/useStore'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import { DualBoolToggle } from '@components/layout/drawer/BoolToggle'
import { ENABLED_ALL, XXS_XXL } from '@assets/constants'
import { useTranslateById } from '@hooks/useTranslateById'

import { StringFilter } from './StringFilter'
import SliderTile from './SliderTile'
import Size from './Size'
import { GenderListItem } from './Gender'
import { QuestConditionSelector } from './QuestConditions'

const STANDARD_BACKUP = /** @type {import('@rm/types/lib').BaseFilter} */ ({
  enabled: false,
  size: 'md',
  all: false,
  adv: '',
})

export default function AdvancedFilter() {
  const { category, id, selectedIds, open } = useLayoutStore(
    (s) => s.advancedFilter,
  )
  const { t } = useTranslation()
  const { t: tId } = useTranslateById()
  const ui = useStatic((s) => s.ui[category])
  const isMobile = useStatic((s) => s.isMobile)
  const legacyFilter = useStore((s) => !!s.userSettings[category]?.legacyFilter)
  const standard = useStore((s) =>
    category === 'pokemon' ? s.filters[category].standard : STANDARD_BACKUP,
  )
  const [filters, setFilters] = useDeepStore(
    `filters.${category}.filter.${id}`,
    standard,
  )
  const backup = React.useRef(filters)

  Utility.analytics(`/${category}/${id}`)
  Utility.analytics(
    'Advanced Filtering',
    `ID: ${id} Size: ${filters?.size || 'md'}`,
    category,
  )

  const handleChange = React.useCallback(
    /**
     * @template {keyof typeof filters} T
     * @param {T} key
     * @param {(typeof filters)[T]} values
     */
    (key, values) => {
      setFilters((prev) => ({
        ...prev,
        [key]: values,
        enabled: prev.enabled || (key !== 'enabled' && !filters.enabled),
      }))
    },
    [setFilters],
  )

  const toggleClose = (save = false) => {
    useLayoutStore.setState((prev) => ({
      advancedFilter: { ...prev.advancedFilter, open: false, id: '' },
    }))
    if (!save) {
      setFilters({ ...backup.current })
    } else if (id === 'global' && selectedIds?.length) {
      const keys = new Set(selectedIds)
      useStore.setState((prev) => ({
        filters: {
          ...prev.filters,
          [category]: {
            ...prev.filters[category],
            filter: Object.fromEntries(
              Object.entries(prev.filters[category].filter).map(
                ([key, oldFilter]) => [
                  key,
                  keys.has(key)
                    ? {
                        ...filters,
                        enabled: true,
                        all: prev.filters[category].easyMode,
                      }
                    : oldFilter,
                ],
              ),
            ),
          },
        },
      }))
    }
  }

  /** @type {import('@components/layout/general/Footer').FooterButton[]} */
  const footerOptions = React.useMemo(
    () => [
      {
        name: 'reset',
        action: () => setFilters({ ...standard }),
        color: 'primary',
        size: category === 'pokemon' ? 2 : null,
      },
      {
        name: 'save',
        action: () => toggleClose(true),
        color: 'secondary',
        size: category === 'pokemon' ? 3 : null,
      },
    ],
    [category, standard, id],
  )

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const handleAllEnabled = React.useCallback(
    ({ target }, checked) => {
      if (target.name === 'all' && checked && !filters.enabled) {
        setFilters('enabled', true)
      }
    },
    [setFilters],
  )

  React.useLayoutEffect(() => {
    if (open) backup.current = filters
  }, [open])

  if (!id) return null
  return (
    <Dialog
      open={!!open}
      onClose={() => toggleClose(false)}
      fullScreen={isMobile && category === 'pokemon'}
    >
      <Header
        titles={`${
          category === 'pokemon' || (!id.startsWith('l') && !id.startsWith('i'))
            ? t('advanced')
            : t('set_size')
        } - ${tId(id)}`}
        action={() => toggleClose(false)}
      />
      <DialogContent sx={{ mt: 3 }}>
        <List>
          {legacyFilter && 'legacy' in ui ? (
            <StringFilter field={`filters.${category}.filter.${id}`} />
          ) : (
            <Grid2 container component={ListItem} disableGutters disablePadding>
              {Object.entries('sliders' in ui ? ui.sliders : {}).map(
                ([subCat, sliders], i) => (
                  <Grid2 key={subCat} component={List} xs={12} sm={6}>
                    {sliders.map((each) => (
                      <ListItem
                        key={`${subCat}${each.name}`}
                        disableGutters
                        disablePadding
                        sx={{ pr: { xs: 0, sm: i ? 0 : 2 } }}
                      >
                        <SliderTile
                          slide={{
                            ...each,
                            disabled: each.disabled || filters.all,
                          }}
                          // @ts-ignore
                          handleChange={handleChange}
                          values={filters[each.name]}
                        />
                      </ListItem>
                    ))}
                  </Grid2>
                ),
              )}
              <Grid2 component={List} xs={12} sm={6}>
                {category === 'pokemon' && (
                  <GenderListItem
                    field={`filters.${category}.filter.${id}`}
                    disabled={filters.all}
                    disableGutters
                  />
                )}
                <Size
                  field={`filters.${category}.filter.${id}`}
                  disableGutters
                />
              </Grid2>
              <Grid2 component={List} xs={12} sm={6}>
                {category === 'pokemon' && (
                  <DualBoolToggle
                    items={XXS_XXL}
                    field={`filters.${category}.filter.${id}`}
                    disabled={filters.all}
                  />
                )}
                {category === 'pokestops' && <QuestConditionSelector id={id} />}
                <DualBoolToggle
                  items={ENABLED_ALL}
                  field={`filters.${category}.filter.${id}`}
                  switchColor="secondary"
                  secondColor="success"
                  onChange={handleAllEnabled}
                />
              </Grid2>
            </Grid2>
          )}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </Dialog>
  )
}
