import defaults from 'lodash/defaults';
import React, { PureComponent } from 'react';
import { FormLabel, Select, AsyncSelect } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { VectorOptions, VectorQuery, defaultQuery, TargetFormat } from '../types';
import VectorQueryField from './VectorQueryField';
import { isBlank, getTemplateSrv } from '../utils';
import { PmApi } from '../pmapi';

const FORMAT_OPTIONS: Array<SelectableValue<string>> = [
    { label: 'Time series', value: TargetFormat.TimeSeries },
    { label: 'Table', value: TargetFormat.MetricsTable },
    { label: 'Heatmap', value: TargetFormat.Heatmap },
];

type Props = QueryEditorProps<DataSource, VectorQuery, VectorOptions>;

interface State {
    expr: string;
    format: SelectableValue<string>;
    legendFormat?: string;
    url?: string;
    container?: SelectableValue<string>;
}

export class VectorQueryEditor extends PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        const query = defaults(this.props.query, defaultQuery);
        this.state = {
            expr: query.expr,
            format: FORMAT_OPTIONS.find(option => option.value === query.format) || FORMAT_OPTIONS[0],
            legendFormat: query.legendFormat,
            url: query.url,
            container: query.container ? { label: query.container, value: query.container } : undefined,
        };
    }

    onExprChange = (expr: string) => {
        this.setState({ expr }, this.onRunQuery);
    };

    onLegendFormatChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const legendFormat = isBlank(event.currentTarget.value) ? undefined : event.currentTarget.value;
        this.setState({ legendFormat }, this.onRunQuery);
    };

    onFormatChange = (format: SelectableValue<string>) => {
        this.setState({ format }, this.onRunQuery);
    };

    onURLChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const url = isBlank(event.currentTarget.value) ? undefined : event.currentTarget.value;
        this.setState({ url }, this.onRunQuery);
    };

    onContainerChange = (container: SelectableValue<string>) => {
        this.setState({ container: container.value ? container : undefined }, this.onRunQuery);
    };

    onRunQuery = () => {
        this.props.onChange({
            ...this.props.query,
            expr: this.state.expr,
            format: this.state.format.value as TargetFormat,
            legendFormat: this.state.legendFormat,
            url: this.state.url,
            container: this.state.container ? this.state.container.value : undefined,
        });
        this.props.onRunQuery();
    };

    loadAvailableContainers = async (query: string): Promise<Array<SelectableValue<string>>> => {
        const variables = getTemplateSrv().variables.map(variable => '$' + variable.name);
        const pmApi = new PmApi(this.props.datasource.state.datasourceRequestOptions);
        const containerInstances = await pmApi.getMetricValues(this.props.datasource.instanceSettings.url!, null, ['containers.name']);
        const options = [...variables, ...containerInstances.values[0].instances.map(instance => instance.value)];
        return [{ label: '-', value: undefined }, ...options.map(value => ({ label: value, value }))];
    };

    render() {
        return (
            <div>
                <VectorQueryField expr={this.state.expr} onChange={this.onExprChange} />

                <div className="gf-form-inline">
                    <div className="gf-form">
                        <FormLabel
                            width={7}
                            tooltip="Controls the name of the time series, using name or pattern. For example
                            ${instance} will be replaced with the instance name.
                            Available variables: metric, metric0 and instance."
                        >
                            Legend
                        </FormLabel>
                        <input
                            type="text"
                            className="gf-form-input"
                            placeholder="legend format"
                            value={this.state.legendFormat}
                            onChange={this.onLegendFormatChange}
                            onBlur={this.onRunQuery}
                        />
                    </div>

                    <div className="gf-form">
                        <div className="gf-form-label">Format</div>
                        <Select
                            className="width-9"
                            isSearchable={false}
                            options={FORMAT_OPTIONS}
                            value={this.state.format}
                            onChange={this.onFormatChange}
                        />
                    </div>

                    <div className="gf-form">
                        <FormLabel width={5} tooltip="Override the URL to pmproxy for this panel. Useful in combination with templating.">
                            URL
                        </FormLabel>
                        <input
                            type="text"
                            className="gf-form-input"
                            placeholder="override URL"
                            value={this.state.url}
                            onChange={this.onURLChange}
                            onBlur={this.onRunQuery}
                        />
                    </div>

                    <div className="gf-form">
                        <FormLabel width={7} tooltip="Specify the container (only possible with container-aware PMDAs).">
                            Container
                        </FormLabel>
                        <AsyncSelect
                            isSearchable={true}
                            defaultOptions={true}
                            className="width-14"
                            loadOptions={this.loadAvailableContainers}
                            value={this.state.container}
                            onChange={this.onContainerChange}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
