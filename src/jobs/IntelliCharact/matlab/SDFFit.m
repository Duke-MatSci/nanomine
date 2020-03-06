% Henry 2019/07
% input sdf curve -> fitting func. & parameters
function fit_result = SDFFit(raw_sdf, ImageSize, show, path_to_write)
raw_sdf = raw_sdf / trapz(raw_sdf);
sdf = raw_sdf(1:(ImageSize/2-1));
xdata = (linspace(1, length(sdf), length(sdf)))';
%% Various fitting methods for "rise-decay"
    % Chi-square dist. func.
    func_chi2 = @(a,b,n,x) a*chi2pdf(b*x,n);
    [chi2fit, gof_chi2] = fit(xdata, sdf, func_chi2, 'StartPoint', [1, 1, 4], 'Lower', [0, 0, 0], 'Robust', 'LAR');
    % gamma dist. pdf.
    func_gam = @(a,b,c,d,x) c*gampdf(x-d,a,b);
    [gamfit, gof_gam] = fit(xdata, sdf, func_gam, 'StartPoint', [1,1,1,0], 'Lower', [0, 0, 0, -100], 'Robust', 'LAR');
    % step func.
    func_step = @(a,b,c,x) a*heaviside(x-b)-a*heaviside(x-c);
    [~,start] = max(diff(sdf(10:end))); start = start + 10;
    [~,endp] = min(diff(sdf(start:end))); endp = endp+start;
    [stepfit, gof_step] = fit(xdata, sdf, func_step, 'StartPoint', [max(sdf),start,endp], 'Robust', 'LAR');
    % Gaussian func.
    func_gauss = @(a,b,c,x) a*exp(-b*(x-c).^2);
    [gaussfit, gof_gauss] = fit(xdata, sdf, func_gauss, 'StartPoint', [max(sdf), 0.5, length(sdf)/2], 'Lower', [0,0,-10], 'Robust', 'LAR');
    % exp func.
    func_exp = @(a,b,c,x) a*exp(-b*(x-c));
    [expfit, gof_exp] = fit(xdata, sdf, func_exp, 'StartPoint', [max(sdf), 0.5, 0], 'Lower', [0, 0, length(sdf)/2], 'Robust', 'LAR');
    % 2-peak func.
    func_2peaks = @(a1, a2, b1, b2, c1, c2, x) func_gauss(a1, b1, c1, x) + func_gauss(a2, b2, c2, x);
    mid_pt = round(length(sdf)/2);
    [twopkfit, gof_2peaks] = fit(xdata, sdf, func_2peaks, 'StartPoint', [max(sdf(1:mid_pt)), max(sdf(mid_pt:end)), 0.5, 0.5, ...
        0, mid_pt], 'Lower', [0, 0, 0, 0, -mid_pt, -mid_pt], 'Robust', 'LAR');
%%
% methods = {'chi2', 'lnexp', 'poly', 'gamma', 'step', 'gauss', '2peak'};
rsquare_all = [gof_chi2.rsquare, gof_gam.rsquare, gof_step.rsquare, gof_gauss.rsquare, gof_exp.rsquare, gof_2peaks.rsquare];
rmse_all = [gof_chi2.rmse, gof_gam.rmse, gof_step.rmse, gof_gauss.rmse, gof_exp.rmse, gof_2peaks.rmse];
[~, best_method] = min(rmse_all);
% sgtitle([sample_name(17:end), '  Best: ', methods{best_method}], 'Interpreter', 'None')
fit_result = containers.Map();
if show
    figure
    plot(xdata, sdf, 'LineWidth', 1.5)
    hold on
end
switch best_method
    case 1
        fit_result('func_type') = 'Chi2';
        fit_result('parameters') = [chi2fit.a, chi2fit.b, chi2fit.n];
        fit_result('func_def') = '"PARAM1 * chi2pdf(PARAM2 * X, PARAM3)"';
        fit_result('remarks') = '"PARAM 1 - peak height; 2,3 - curve shape"';
        if show
            plot(xdata, func_chi2(chi2fit.a, chi2fit.b, chi2fit.n, xdata), '--', 'LineWidth', 1.5)
            title('\chi^2 distribution fit', 'FontSize', 18)
        end
    case 2
        fit_result('func_type') = 'Gamma';
        fit_result('parameters') = [gamfit.a, gamfit.b, gamfit.c, gamfit.d];
        fit_result('func_def') = '"PARAM3 * gampdf(X - PARAM4, PARAM1, PARAM2)"';
        fit_result('remarks') = '"PARAM 3 - peak height; 4 - peak shift; 1,2 - curve shape"';
        if show
            plot(xdata, func_gam(gamfit.a, gamfit.b, gamfit.c, gamfit.d, xdata), '--', 'LineWidth', 1.5)
            title('\Gamma distribution fit', 'FontSize', 18)
        end
    case 3
        fit_result('func_type') = 'Step';
        fit_result('parameters') = [stepfit.a, stepfit.b, stepfit.c];
        fit_result('func_def') = 'PARAM1 * (heaviside(X - PARAM2) - heaviside (X - PARAM3))';
        fit_result('remarks') = 'PARAM 1 - step height; 2 - step start; 3 - step end';
        if show
            plot(xdata, func_step(stepfit.a, stepfit.b, stepfit.c, xdata), '--', 'LineWidth', 1.5)
            title('Step function fit', 'FontSize', 18)
        end
    case 4
        fit_result('func_type') = 'Gaussian';
        fit_result('parameters') = [gaussfit.a, gaussfit.b, gaussfit.c];
        fit_result('func_def') = 'PARAM1 * exp(-PARAM2 * (X - PARAM3) ^ 2)';
        fit_result('remarks') = 'PARAM 1 - peak height; 2 - peak width; 3 - peak shift';
        if show
            plot(xdata, func_gauss(gaussfit.a, gaussfit.b, gaussfit.c, xdata), '--', 'LineWidth', 1.5)
            title('Gaussian function fit', 'FontSize', 18)
        end
    case 5
        fit_result('func_type') = 'Exponential';
        fit_result('parameters') = [expfit.a, expfit.b, expfit.c];
        fit_result('func_def') = 'PARAM1 * exp(-PARAM2 * (X - PARAM3))';
        fit_result('remarks') = 'PARAM 1 - peak height; 2 - curve shape; 3 - peak shift';
        if show
            plot(xdata, func_gauss(expfit.a, expfit.b, expfit.c, xdata), '--', 'LineWidth', 1.5)
            title('Exponential function fit', 'FontSize', 18)
        end
    case 6
        fit_result('func_type') = 'Two-peak';
        fit_result('parameters') = [twopkfit.a1, twopkfit.a2, twopkfit.b1, twopkfit.b2, ...
            twopkfit.c1, twopkfit.c2];
        fit_result('func_def') = 'PARAM1 * exp(-PARAM3 * (X - PARAM5) ^ 2) + PARAM2 * exp(-PARAM4 * (X - PARAM6) ^ 2)';
        fit_result('remarks') = '"PARAM 1,2 - peak height; 3,4 - peak width; 5,6 - peak shift"';
        if show
            plot(xdata, func_2peaks(twopkfit.a1, twopkfit.a2, twopkfit.b1, twopkfit.b2, twopkfit.c1, twopkfit.c2, xdata),...
                '--', 'LineWidth', 1.5)
            title('Two-peak fit', 'FontSize', 18)
        end
end
hold off
set(gca, 'ytick', [])
saveas(gcf, [path_to_write, '/SDF_fitted.jpg']);
fit_result('goodness') = [rsquare_all(best_method), rmse_all(best_method)];
end
